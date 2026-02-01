import { type RootSpec } from "../dsl";

export const simpleText: RootSpec = {
  id: "simple-text",
  background: "white",
  body: {
    type: "text",
    text: "Vizail",
    variant: "h1",
    align: "center",
  },
};
