import { afterAll } from "@jest/globals";
import mongoose from "mongoose";

afterAll(async () => {
  await mongoose.disconnect();
});
