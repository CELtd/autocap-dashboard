import { GraphQLClient } from "graphql-request";
import { config } from "../constants";

// Create GraphQL client for the Filecoin Pay subgraph
export const subgraphClient = new GraphQLClient(config.subgraphUrl, {
  headers: {
    "Content-Type": "application/json",
  },
});

