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
    controller: () => ({ hello: "world" }),
    roles: ["Authenticated"],
  },
};

export default Mappings;
