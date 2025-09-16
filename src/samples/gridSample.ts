import { type RootSpec } from "../dsl";

export const gridSample: RootSpec = {
  id: "grid-sample",
  background: "white",
  padding: 6,
  body: {
    type: "grid",
    columns: 3,
    gap: 4,
    children: [
      { type: "text", text: "One", variant: "body", align: "center" },
      { type: "text", text: "Two", variant: "body", align: "center" },
      { type: "text", text: "Three", variant: "body", align: "center" },
      { type: "text", text: "Four", variant: "body", align: "center" },
      { type: "text", text: "Five", variant: "body", align: "center" },
      { type: "text", text: "Six", variant: "body", align: "center" },
    ],
  },
};
