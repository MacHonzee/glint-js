import AppStates from "../config/app-states.js";
import AppStateService from "../services/app-state/app-state-service.js";
import Config from "../services/utils/config.js";
import UseCaseError from "../services/server/use-case-error.js";

class InvalidAppStateError extends UseCaseError {
  // Constructor now takes the full currentAppStateDetails object
  constructor(currentAppStateDetails, allowedStates, route) { 
    const message = `The application is currently in '${currentAppStateDetails.appState}' state (since: ${currentAppStateDetails.from}, reason: ${currentAppStateDetails.reason || 'N/A'}). Access to '${route}' requires one of '${allowedStates.join(", ")}' states.`;
    super(
      message,
      "invalidAppState",
      { 
        // Include more details in dtoOut
        deniedState: {
          appState: currentAppStateDetails.appState,
          from: currentAppStateDetails.from,
          reason: currentAppStateDetails.reason,
          isDefault: currentAppStateDetails.isDefault
        },
        allowedStates, 
        route 
      },
      503 // Service Unavailable
    );
  }
}

class AppStateMiddleware {
  ORDER = -200; 

  async process(req, res, next) {
    const skipCheck = Config.get("SKIP_APP_STATE_CHECK", Boolean);
    if (skipCheck) {
      req.ucEnv.appStateInfo = { 
        checkSkipped: true, 
        appState: AppStates.INITIAL, 
        reason: "Check skipped via environment variable."
      };
      return next();
    }

    const currentAppStateDetails = await AppStateService.getCurrentState();
    req.ucEnv.appStateInfo = { ...currentAppStateDetails, checkSkipped: false };
    
    const actualCurrentState = currentAppStateDetails.appState;

    const routeMapping = req.ucEnv.mapping;
    const allowedStates = routeMapping.appStates || [AppStates.ACTIVE]; 
    
    if (!allowedStates.includes(actualCurrentState)) {
      // Pass the full currentAppStateDetails to the error constructor
      throw new InvalidAppStateError(currentAppStateDetails, allowedStates, req.path); 
    }

    return next();
  }
}

export default new AppStateMiddleware();
export { InvalidAppStateError };
