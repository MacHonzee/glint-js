import SysConfigModel from "../../models/sys-config-model.js";
import LruCache from "../utils/lru-cache.js";
import Config from "../utils/config.js";
import AppStates from "../../config/app-states.js";

const CACHE_TTL_MS_CONFIG_KEY = "APP_STATE_CACHE_TTL_MS";
const CACHE_MAX_ITEMS_CONFIG_KEY = "APP_STATE_CACHE_MAX_ITEMS";
const DEFAULT_CACHE_TTL_MS = 60 * 1000; // 1 minute
const DEFAULT_CACHE_MAX_ITEMS = 1; // Only one item to cache
const CURRENT_APP_STATE_CACHE_KEY = "current_app_state";

class AppStateService {
  constructor() {
    const cacheTtl = Config.get(CACHE_TTL_MS_CONFIG_KEY, Number) ?? DEFAULT_CACHE_TTL_MS;
    const cacheMax = Config.get(CACHE_MAX_ITEMS_CONFIG_KEY, Number) ?? DEFAULT_CACHE_MAX_ITEMS;

    this._cache = new LruCache({
      max: cacheMax,
      ttl: cacheTtl,
      fetchMethod: this._resolveCurrentAppStateFromDb.bind(this),
    });
  }

  /**
   * Resolves the current application state from the stateSchedule in the database.
   * This method is used by the LRU cache.
   * @private
   */
  async _resolveCurrentAppStateFromDb() {
    const configDoc = await SysConfigModel.getSingleton();
    const now = new Date();

    if (!configDoc || !configDoc.stateSchedule || configDoc.stateSchedule.length === 0) {
      return this._getDefaultInitialState("No schedule configured.");
    }

    // Sort schedule by 'from' date in descending order to easily find the latest applicable state
    const sortedSchedule = [...configDoc.stateSchedule].sort((a, b) => b.from.getTime() - a.from.getTime());

    const currentScheduledState = sortedSchedule.find(stateEntry => stateEntry.from <= now);

    if (!currentScheduledState) {
      // All scheduled states are in the future
      return this._getDefaultInitialState("All scheduled states are in the future.");
    }

    // Return a copy of the state entry, marking it as not a default programmatic state
    return { 
      appState: currentScheduledState.appState,
      from: currentScheduledState.from,
      reason: currentScheduledState.reason,
      isDefault: false // Indicates this state is from the persisted schedule
    };
  }

  _getDefaultInitialState(reasonSuffix) {
    return {
      appState: AppStates.INITIAL,
      from: new Date(0), // Epoch time
      reason: `System initial default state. ${reasonSuffix}`,
      isDefault: true, // Flag to indicate this is not a persisted state from schedule
    };
  }

  /**
   * Gets the current application state configuration.
   * Uses LRU cache.
   * @returns {Promise<Object>} The current application state.
   */
  async getCurrentState() {
    return await this._cache.fetch(CURRENT_APP_STATE_CACHE_KEY);
  }

  /**
   * Schedules a new application state change.
   * Adds the new state to the stateSchedule array in SysConfigModel.
   * @param {Object} dtoIn - The data transfer object.
   * @param {string} dtoIn.appState - The application state.
   * @param {string|Date} dtoIn.from - The date/time from which this state is active.
   * @param {string} [dtoIn.reason] - Optional reason for the state change.
   * @returns {Promise<Object>} The updated SysConfigModel document (or its toJSON representation).
   */
  async scheduleStateChange(dtoIn) {
    let configDoc = await SysConfigModel.getSingleton();

    if (!configDoc) {
      // If no config doc exists, upsertSingleton will create one with an empty schedule
      // to which we'll add the new state.
      configDoc = { stateSchedule: [] }; // Initialize for population
    }
    
    const newScheduleEntry = {
      appState: dtoIn.appState,
      from: new Date(dtoIn.from),
      reason: dtoIn.reason,
    };

    // Add new entry and sort the schedule by 'from' date in ascending order for storage
    // It's generally good practice to keep stored arrays sorted if their order matters for reads,
    // though _resolveCurrentAppStateFromDb also sorts. Sorting here ensures consistency.
    const updatedSchedule = [...(configDoc.stateSchedule || [])];
    
    // Prevent duplicate 'from' times by removing existing entry with the same 'from' time
    const existingEntryIndex = updatedSchedule.findIndex(
        (entry) => entry.from.getTime() === newScheduleEntry.from.getTime()
    );
    if (existingEntryIndex !== -1) {
        updatedSchedule.splice(existingEntryIndex, 1);
    }
    
    updatedSchedule.push(newScheduleEntry);
    updatedSchedule.sort((a, b) => a.from.getTime() - b.from.getTime());

    const updatedDoc = await SysConfigModel.upsertSingleton({
      // configId is handled by upsertSingleton if not present
      stateSchedule: updatedSchedule,
    });

    this._cache.delete(CURRENT_APP_STATE_CACHE_KEY); // Invalidate cache
    return updatedDoc.toJSON(); // Assuming upsertSingleton returns a Mongoose document
  }

  /**
   * Clears the app state cache.
   */
  clearCache() {
    this._cache.delete(CURRENT_APP_STATE_CACHE_KEY);
  }
}

export default new AppStateService();
