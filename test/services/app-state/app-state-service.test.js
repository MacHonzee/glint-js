import AppStateService from "../../../src/services/app-state/app-state-service.js";
import SysConfigModel from "../../../src/models/sys-config-model.js";
import AppStates from "../../../src/config/app-states.js";
import Config from "../../../src/services/utils/config.js";
import LruCache from "../../../src/services/utils/lru-cache.js";

jest.mock("../../../src/models/sys-config-model.js", () => ({
  __esModule: true,
  default: {
    getSingleton: jest.fn(),
    upsertSingleton: jest.fn(),
  }
}));

jest.mock("../../../src/services/utils/config.js", () => ({
  __esModule: true,
  default: {
    get: jest.fn((key) => {
      if (key === "APP_STATE_CACHE_TTL_MS") return 60000;
      if (key === "APP_STATE_CACHE_MAX_ITEMS") return 1;
      return undefined;
    }),
  }
}));

let mockCacheInstanceFetch;
let mockCacheInstanceDelete;
jest.mock("../../../src/services/utils/lru-cache.js", () => {
  mockCacheInstanceFetch = jest.fn();
  mockCacheInstanceDelete = jest.fn();
  return jest.fn(() => ({
    fetch: mockCacheInstanceFetch,
    delete: mockCacheInstanceDelete,
  }));
});

describe("AppStateService (State Schedule Logic)", () => {
  let appStateService;
  const CURRENT_APP_STATE_CACHE_KEY = "current_app_state";

  beforeEach(() => {
    jest.clearAllMocks();
    appStateService = new AppStateService(); 
    expect(LruCache).toHaveBeenCalledTimes(1); // Ensure cache is initialized once per service instance
                                           // and LruCache mock is called when new AppStateService()
  });

  const getResolvedFetchMethod = () => {
      // Access the LruCache constructor mock calls.
      // Each call to 'new AppStateService()' results in a call to 'new LruCache()'.
      // We need the latest one if AppStateService were to be instantiated multiple times in tests (not here).
      const lruCacheConstructorCall = LruCache.mock.calls[LruCache.mock.calls.length - 1];
      return lruCacheConstructorCall[0].fetchMethod;
  }


  describe("_resolveCurrentAppStateFromDb (via getCurrentState)", () => {
    it("should return default INITIAL state if no configDoc", async () => {
      SysConfigModel.default.getSingleton.mockResolvedValue(null);
      // Simulate cache miss by directly invoking the fetchMethod logic
      mockCacheInstanceFetch.mockImplementation(getResolvedFetchMethod());
      
      const state = await appStateService.getCurrentState();
      expect(state.appState).toBe(AppStates.INITIAL);
      expect(state.isDefault).toBe(true);
      expect(state.reason).toContain("No schedule configured.");
    });

    it("should return default INITIAL state if stateSchedule is empty", async () => {
      SysConfigModel.default.getSingleton.mockResolvedValue({ stateSchedule: [] });
      mockCacheInstanceFetch.mockImplementation(getResolvedFetchMethod());

      const state = await appStateService.getCurrentState();
      expect(state.appState).toBe(AppStates.INITIAL);
      expect(state.isDefault).toBe(true);
      expect(state.reason).toContain("No schedule configured.");
    });

    it("should return default INITIAL state if all scheduled states are in the future", async () => {
      const futureTime = new Date(Date.now() + 3600000); // 1 hour in future
      SysConfigModel.default.getSingleton.mockResolvedValue({
        stateSchedule: [{ appState: AppStates.ACTIVE, from: futureTime, reason: "Future Active" }],
      });
      mockCacheInstanceFetch.mockImplementation(getResolvedFetchMethod());

      const state = await appStateService.getCurrentState();
      expect(state.appState).toBe(AppStates.INITIAL);
      expect(state.isDefault).toBe(true);
      expect(state.reason).toContain("All scheduled states are in the future.");
    });

    it("should return the correct current state from the schedule", async () => {
      const now = Date.now();
      const schedule = [
        { appState: AppStates.IN_MAINTENANCE, from: new Date(now - 7200000), reason: "Past Maint" }, 
        { appState: AppStates.ACTIVE, from: new Date(now - 3600000), reason: "Currently Active" },   
        { appState: AppStates.IN_MAINTENANCE, from: new Date(now + 3600000), reason: "Future Maint" }, 
      ];
      SysConfigModel.default.getSingleton.mockResolvedValue({ stateSchedule: schedule });
      mockCacheInstanceFetch.mockImplementation(getResolvedFetchMethod());

      const state = await appStateService.getCurrentState();
      expect(state.appState).toBe(AppStates.ACTIVE);
      expect(state.reason).toBe("Currently Active");
      expect(state.isDefault).toBe(false);
      expect(state.from).toEqual(new Date(now-3600000));
    });

    it("should pick the latest applicable state if multiple past states exist", async () => {
        const now = Date.now();
        const schedule = [
          { appState: AppStates.INITIAL, from: new Date(now - 10000000), reason: "Initial Setup"},
          { appState: AppStates.IN_MAINTENANCE, from: new Date(now - 7200000), reason: "Old Maint" }, 
          { appState: AppStates.ACTIVE, from: new Date(now - 3600000), reason: "Recent Active" },  
        ];
        SysConfigModel.default.getSingleton.mockResolvedValue({ stateSchedule: schedule });
        mockCacheInstanceFetch.mockImplementation(getResolvedFetchMethod());

        const state = await appStateService.getCurrentState();
        expect(state.appState).toBe(AppStates.ACTIVE);
        expect(state.reason).toBe("Recent Active");
    });
  });

  describe("scheduleStateChange", () => {
    it("should add a new state to an empty schedule and sort", async () => {
      SysConfigModel.default.getSingleton.mockResolvedValue(null); 
      const dtoIn = { appState: AppStates.ACTIVE, from: "2023-01-01T00:00:00Z", reason: "First" };
      const expectedScheduleEntry = { appState: AppStates.ACTIVE, from: new Date(dtoIn.from), reason: dtoIn.reason };
      
      // Mock toJSON for the object returned by upsertSingleton
      SysConfigModel.default.upsertSingleton.mockResolvedValue({
          stateSchedule: [expectedScheduleEntry],
          toJSON: function() { return { stateSchedule: this.stateSchedule }; } 
      });
      
      await appStateService.scheduleStateChange(dtoIn);

      expect(SysConfigModel.default.upsertSingleton).toHaveBeenCalledWith({
        stateSchedule: [expectedScheduleEntry],
      });
      expect(mockCacheInstanceDelete).toHaveBeenCalledWith(CURRENT_APP_STATE_CACHE_KEY);
    });

    it("should add a new state to an existing schedule and maintain sort order", async () => {
      const now = new Date();
      const initialEntryFrom = new Date(now.getTime() - 100000);
      const initialSchedule = [
        { appState: AppStates.INITIAL, from: initialEntryFrom, reason: "Initial" },
      ];
      SysConfigModel.default.getSingleton.mockResolvedValue({ stateSchedule: initialSchedule });
      
      const dtoInFrom = new Date(now.getTime() - 50000);
      const dtoIn = { appState: AppStates.ACTIVE, from: dtoInFrom.toISOString(), reason: "New Active" };
      
      SysConfigModel.default.upsertSingleton.mockImplementation(arg => {
        return Promise.resolve({ 
            stateSchedule: arg.stateSchedule, 
            toJSON: function() { return { stateSchedule: this.stateSchedule };}
        });
      });

      await appStateService.scheduleStateChange(dtoIn);

      expect(SysConfigModel.default.upsertSingleton).toHaveBeenCalled();
      const finalSchedule = SysConfigModel.default.upsertSingleton.mock.calls[0][0].stateSchedule;
      expect(finalSchedule.length).toBe(2);
      expect(finalSchedule[0].appState).toBe(AppStates.INITIAL);
      expect(finalSchedule[0].from).toEqual(initialEntryFrom);
      expect(finalSchedule[1].appState).toBe(AppStates.ACTIVE); 
      expect(finalSchedule[1].from).toEqual(dtoInFrom);
      expect(mockCacheInstanceDelete).toHaveBeenCalledWith(CURRENT_APP_STATE_CACHE_KEY);
    });

    it("should replace an existing state if 'from' time is identical", async () => {
        const fromTime = new Date("2024-05-01T10:00:00Z");
        const initialSchedule = [
          { appState: AppStates.INITIAL, from: new Date("2024-04-01T00:00:00Z"), reason: "Way back" },
          { appState: AppStates.IN_MAINTENANCE, from: fromTime, reason: "Old Maint at this time" },
          { appState: AppStates.ACTIVE, from: new Date("2024-06-01T00:00:00Z"), reason: "Future Active" }
        ];
        SysConfigModel.default.getSingleton.mockResolvedValue({ stateSchedule: initialSchedule });
        
        SysConfigModel.default.upsertSingleton.mockImplementation(arg => {
            return Promise.resolve({ 
                stateSchedule: arg.stateSchedule,
                toJSON: function() { return { stateSchedule: this.stateSchedule };}
            });
        });

        const dtoIn = { appState: AppStates.ACTIVE, from: fromTime.toISOString(), reason: "New Active at this time" };
        await appStateService.scheduleStateChange(dtoIn);

        expect(SysConfigModel.default.upsertSingleton).toHaveBeenCalled();
        const finalSchedule = SysConfigModel.default.upsertSingleton.mock.calls[0][0].stateSchedule;

        expect(finalSchedule.length).toBe(3); 
        const updatedEntry = finalSchedule.find(s => s.from.getTime() === fromTime.getTime());
        expect(updatedEntry.appState).toBe(AppStates.ACTIVE);
        expect(updatedEntry.reason).toBe("New Active at this time");
        
        expect(finalSchedule[0].from.getTime()).toBeLessThan(finalSchedule[1].from.getTime());
        expect(finalSchedule[1].from.getTime()).toBeLessThan(finalSchedule[2].from.getTime());
    });
  });
});
