import AppStateMiddleware, { InvalidAppStateError } from "../../../src/middlewares/app-state-middleware.js";
import AppStateService from "../../../src/services/app-state/app-state-service.js";
import Config from "../../../src/services/utils/config.js";
import AppStates from "../../../src/config/app-states.js";

jest.mock("../../../src/services/app-state/app-state-service.js", () => ({
  __esModule: true,
  default: { 
    getCurrentState: jest.fn(),
  }
}));

jest.mock("../../../src/services/utils/config.js", () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
  }
}));

describe("AppStateMiddleware (Simplified Logic)", () => {
  let middleware;
  let mockReq;
  let mockRes;
  let mockNext;

  beforeEach(() => {
    jest.clearAllMocks();
    middleware = new AppStateMiddleware();
    mockReq = {
      ucEnv: {
        mapping: {}, 
        appStateInfo: undefined 
      },
      path: "/test/route", 
    };
    mockRes = {}; 
    mockNext = jest.fn(); 
  });

  it("should skip check if SKIP_APP_STATE_CHECK is true", async () => {
    Config.default.get.mockReturnValue(true); 

    await middleware.process(mockReq, mockRes, mockNext);

    expect(Config.default.get).toHaveBeenCalledWith("SKIP_APP_STATE_CHECK", Boolean);
    expect(mockNext).toHaveBeenCalledWith(); 
    expect(AppStateService.default.getCurrentState).not.toHaveBeenCalled();
    expect(mockReq.ucEnv.appStateInfo).toEqual({ 
      checkSkipped: true,
      appState: AppStates.INITIAL, 
      reason: "Check skipped via environment variable."
    });
  });

  it("should call next() if current state from service is allowed for the route", async () => {
    Config.default.get.mockReturnValue(false); 
    const serviceState = { appState: AppStates.ACTIVE, from: new Date(), isDefault: false, reason: "From Schedule" };
    AppStateService.default.getCurrentState.mockResolvedValue(serviceState);
    mockReq.ucEnv.mapping.appStates = [AppStates.ACTIVE];

    await middleware.process(mockReq, mockRes, mockNext);

    expect(mockNext).toHaveBeenCalledWith();
    expect(mockReq.ucEnv.appStateInfo).toEqual({ ...serviceState, checkSkipped: false });
  });

  it("should use default [AppStates.ACTIVE] for allowedStates if route.appStates is not defined", async () => {
    Config.default.get.mockReturnValue(false);
    const serviceState = { appState: AppStates.ACTIVE, from: new Date(), isDefault: false };
    AppStateService.default.getCurrentState.mockResolvedValue(serviceState);
    // mockReq.ucEnv.mapping.appStates is undefined
    
    await middleware.process(mockReq, mockRes, mockNext);
    expect(mockNext).toHaveBeenCalledWith();
  });
  
  it("should throw InvalidAppStateError with enhanced details if current state from service is not allowed", async () => {
    Config.default.get.mockReturnValue(false);
    const fromDate = new Date();
    const serviceState = { 
      appState: AppStates.IN_MAINTENANCE, 
      from: fromDate, 
      isDefault: false, 
      reason: "Scheduled Maint" 
    };
    AppStateService.default.getCurrentState.mockResolvedValue(serviceState);
    mockReq.ucEnv.mapping.appStates = [AppStates.ACTIVE]; // Route only allows ACTIVE

    await middleware.process(mockReq, mockRes, mockNext);

    expect(mockNext).toHaveBeenCalledTimes(1);
    const error = mockNext.mock.calls[0][0];
    expect(error).toBeInstanceOf(InvalidAppStateError);
    expect(error.code).toBe("invalidAppState");
    expect(error.status).toBe(503);
    // Expect the enhanced dtoOut structure
    expect(error.dtoOut).toEqual({
      deniedState: { // Changed from currentState to deniedState object
        appState: AppStates.IN_MAINTENANCE,
        from: fromDate,
        reason: "Scheduled Maint",
        isDefault: false,
      },
      allowedStates: [AppStates.ACTIVE],
      route: "/test/route",
    });
  });

  // Tests for internal time window logic (effectiveState, timeWindowNote) are removed.

  it("should correctly use INITIAL state from service if that's the current state and route allows it", async () => {
    Config.default.get.mockReturnValue(false);
    const serviceState = { 
        appState: AppStates.INITIAL, 
        from: new Date(0), 
        isDefault: true, 
        reason: "Default initial" 
    };
    AppStateService.default.getCurrentState.mockResolvedValue(serviceState);
    mockReq.ucEnv.mapping.appStates = [AppStates.INITIAL]; 

    await middleware.process(mockReq, mockRes, mockNext);
    expect(mockNext).toHaveBeenCalledWith();
    expect(mockReq.ucEnv.appStateInfo.appState).toEqual(AppStates.INITIAL);
  });

   it("should block if service returns INITIAL state and route requires ACTIVE", async () => {
    Config.default.get.mockReturnValue(false);
    const serviceState = { 
        appState: AppStates.INITIAL, 
        from: new Date(0), 
        isDefault: true,
        reason: "Default initial" 
    };
    AppStateService.default.getCurrentState.mockResolvedValue(serviceState);
    mockReq.ucEnv.mapping.appStates = [AppStates.ACTIVE]; 

    await middleware.process(mockReq, mockRes, mockNext);
    expect(mockNext).toHaveBeenCalledTimes(1);
    expect(mockNext.mock.calls[0][0]).toBeInstanceOf(InvalidAppStateError);
  });

  it("should populate req.ucEnv.appStateInfo correctly with service data", async () => {
    Config.default.get.mockReturnValue(false);
    const serviceState = { appState: AppStates.ACTIVE, from: new Date(), isDefault: false, reason: "Live from schedule" };
    AppStateService.default.getCurrentState.mockResolvedValue(serviceState);
    mockReq.ucEnv.mapping.appStates = [AppStates.ACTIVE];

    await middleware.process(mockReq, mockRes, mockNext);

    expect(mockReq.ucEnv.appStateInfo).toEqual({
      ...serviceState,
      checkSkipped: false,
    });
  });
});
