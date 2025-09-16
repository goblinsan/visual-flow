import { type RootSpec } from "../dsl";

export const stackSample: RootSpec = {
  id: "stack-sample",
  background: "white",
  padding: 6,
  body: {
    type: "stack",
    gap: 4,
    padding: 0,
    direction: "vertical",
    children: [
      { type: "text", text: "Acme Dashboard", variant: "h1" },
      { type: "text", text: "Key metrics at a glance", variant: "body" },
    ],
  },
};
