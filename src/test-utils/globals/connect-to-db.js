import MongoClient from "../../services/database/mongo-client.js";

await MongoClient.initPrimaryAndAuth();
