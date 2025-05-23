import AppStates from "../config/app-states.js";

// Renamed from SysSetAppStateSchema to SysScheduleStateChangeSchema
// 'to' field removed
const SysScheduleStateChangeSchema = { 
  type: "object",
  properties: {
    appState: {
      type: "string",
      enum: Object.values(AppStates), 
    },
    from: {
      type: "string",
      format: "date-time", // ISO 8601 format e.g., "2023-10-26T10:00:00Z"
    },
    // 'to' field is removed as it's not used in the stateSchedule model
    reason: {
      type: "string",
      nullable: true, 
      maxLength: 4000, 
    },
  },
  required: ["appState", "from"],
  additionalProperties: false,
};

export default {
  // Updated export name
  SysScheduleStateChangeSchema, 
};
