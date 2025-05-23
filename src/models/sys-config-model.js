import { AbstractModel } from "../services/database/abstract-model.js";
import AppStates from "../config/app-states.js";

const SYS_CONFIG_ID = "current_app_state_config"; // Remains the same

class SysConfigModel extends AbstractModel {
  constructor() {
    const StateScheduleSchema = { // Define sub-schema for clarity
      appState: {
        type: String,
        enum: Object.values(AppStates),
        required: true,
      },
      from: {
        type: Date,
        required: true,
      },
      reason: {
        type: String,
        // No specific maxLength here, can be enforced at DTO level if needed
      },
    };

    super(
      {
        configId: { 
          type: String, 
          default: SYS_CONFIG_ID, 
          unique: true, 
          required: true 
        },
        stateSchedule: {
          type: [StateScheduleSchema], // Array of the sub-schema
          default: [], // Default to an empty array
        }
      },
      { timestamps: true } // Adds createdAt and updatedAt
    );
  }

  static async buildIndexes() {
    // The unique index on configId is already defined in the schema
    return await this.syncIndexes();
  }

  static async getSingleton() {
    return await this.findOne({ configId: SYS_CONFIG_ID });
  }

  // upsertSingleton might need to be re-evaluated or used carefully.
  // For managing stateSchedule, specific methods might be better,
  // e.g., addStateToSchedule, which would be handled by AppStateService.
  // For now, a general upsert that replaces the schedule might be what the service uses.
  static async upsertSingleton(updateDto) {
    // This will replace the entire document except for configId, effectively replacing stateSchedule
    return await this.findOneAndUpdate(
      { configId: SYS_CONFIG_ID },
      { ...updateDto, configId: SYS_CONFIG_ID }, // Ensure configId and new schedule are set
      { new: true, upsert: true, runValidators: true }
    );
  }
}

const sysConfigModel = new SysConfigModel();
export default await sysConfigModel.createModel("AUTH", "CONFIG"); // Domain "AUTH"
