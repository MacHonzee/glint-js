class AssertionService {
  async assertCallThrows(call, assertThrow) {
    let hasThrown = false;
    try {
      typeof call === "function" ? await call() : await call; // can be promise or function
    } catch (e) {
      hasThrown = true;
      assertThrow(e.response, e);
    }

    if (!hasThrown) throw new Error("Should have raised error but did not.");
  }
}

export default new AssertionService();
