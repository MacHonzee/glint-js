import FileRoute from "../routes/file-route.js";
import { DefaultRoles } from "glint-js";

const Mappings = {
  "/testcase/hello": {
    method: "post",
    controller: () => ({ hello: "world" }),
    roles: ["Admin"],
  },
  "/testcase/public": {
    method: "post",
    controller: () => ({ hello: "world" }),
    roles: ["Public"],
  },
  "/testcase/authenticated": {
    method: "post",
    controller: ({ session }) => ({ hello: "authenticated world", user: session.user }),
    roles: ["Authenticated"],
  },
  "/testcase/authorized": {
    method: "post",
    controller: ({ authorizationResult }) => ({ hello: "authorized world", authorizationResult }),
    roles: ["Admin", "Client"],
  },
  "/testcase/acceptFile": {
    method: "post",
    controller: FileRoute.acceptFile,
    roles: ["Public"],
  },
  "/testcase/returnFile": {
    method: "post",
    controller: () => ({ hello: "world" }), // TODO finish this to return some file
    roles: ["Public"],
  },

  // Partial override: only roles are overridden, controller and method come from default mappings
  "/user/list": {
    roles: [DefaultRoles.admin, DefaultRoles.authority, "Editor"],
  },
};

export default Mappings;
