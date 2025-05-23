// test/routes/sys-route/scheduleStateChange.test.js
import SysRoute from "../../../src/routes/sys-route.js";
import AppStateService from "../../../src/services/app-state/app-state-service.js";
import AppStates from "../../../src/config/app-states.js";

jest.mock("../../../src/services/app-state/app-state-service.js", () => ({
  __esModule: true, 
  default: { 
    scheduleStateChange: jest.fn(), // Renamed from updateState
  }
}));

describe("SysRoute - scheduleStateChange", () => {
  let sysRouteInstance; 
  let mockUcEnv;

  beforeEach(() => {
    jest.clearAllMocks();
    sysRouteInstance = SysRoute; // SysRoute is "export default new SysRoute()"
    
    mockUcEnv = {
      dtoIn: {}, 
    };
  });

  it("should call AppStateService.default.scheduleStateChange with dtoIn and return result", async () => {
    const dtoIn = {
      appState: AppStates.IN_MAINTENANCE,
      from: "2023-12-01T10:00:00Z",
      // 'to' field is no longer part of the DTO
      reason: "Deploying new version",
    };
    mockUcEnv.dtoIn = dtoIn;

    const serviceResult = { 
      stateSchedule: [{...dtoIn, from: new Date(dtoIn.from) }], // Example service result
      // ... other properties if service returns more
    };
    AppStateService.default.scheduleStateChange.mockResolvedValue(serviceResult);

    const result = await sysRouteInstance.scheduleStateChange(mockUcEnv); // Renamed method

    expect(AppStateService.default.scheduleStateChange).toHaveBeenCalledWith(dtoIn);
    expect(result).toEqual({
      message: "Application state change scheduled successfully.", // Updated message
      scheduleResult: serviceResult, // Contains result from the service
    });
  });

  it("should handle dtoIn without optional 'reason' field", async () => {
    const dtoIn = {
      appState: AppStates.ACTIVE,
      from: "2024-01-01T00:00:00Z",
    };
    mockUcEnv.dtoIn = dtoIn;

    const serviceResult = { 
      stateSchedule: [{ appState: dtoIn.appState, from: new Date(dtoIn.from), reason: undefined }],
    };
    AppStateService.default.scheduleStateChange.mockResolvedValue(serviceResult); 

    const result = await sysRouteInstance.scheduleStateChange(mockUcEnv);

    expect(AppStateService.default.scheduleStateChange).toHaveBeenCalledWith(dtoIn);
    expect(result.scheduleResult.stateSchedule[0].reason).toBeUndefined();
  });
});
