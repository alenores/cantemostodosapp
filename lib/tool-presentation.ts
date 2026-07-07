export type ToolPresentation = "modal" | "page";

export function isToolPagePresentation(
  presentation: ToolPresentation = "modal",
): boolean {
  return presentation === "page";
}
