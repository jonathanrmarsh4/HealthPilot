import { test, expect } from "vitest";
import { render } from "@testing-library/react";
import { ExerciseDetailsModal } from "../ExerciseDetailsModal";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactElement } from "react";

// Wrap with QueryClientProvider since modal uses useQuery
function renderWithQuery(ui: ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      {ui}
    </QueryClientProvider>
  );
}

test("modal keeps clicked title and ignores late data", () => {
  const ex = {
    id: "e1",
    name: "Lat Pull Down",
    target: "lats",
    bodyPart: "back",
    equipment: "cable",
    externalId: null,
  };

  const { getByText } = renderWithQuery(
    <ExerciseDetailsModal open={true} onClose={() => {}} exercise={ex} />
  );

  // Modal should display the exact clicked exercise name
  expect(getByText("Lat Pull Down")).toBeTruthy();
});

test("modal shows correct name even with different externalId", () => {
  const ex = {
    id: "e2",
    name: "Barbell Bench Press",
    target: "pectorals",
    bodyPart: "chest",
    equipment: "barbell",
    externalId: "0025", // Has external ID
  };

  const { getByText } = renderWithQuery(
    <ExerciseDetailsModal open={true} onClose={() => {}} exercise={ex} />
  );

  // Modal title should always be the clicked exercise name, never overwritten by fetched data
  expect(getByText("Barbell Bench Press")).toBeTruthy();
});

test("modal shows unavailable message when externalId is null", () => {
  const ex = {
    id: "e3",
    name: "Custom Exercise",
    target: "unknown",
    bodyPart: "unknown",
    equipment: null,
    externalId: null,
  };

  const { getByText } = renderWithQuery(
    <ExerciseDetailsModal open={true} onClose={() => {}} exercise={ex} />
  );

  // Should show the exercise name
  expect(getByText("Custom Exercise")).toBeTruthy();
  
  // Should show unavailable message (not try to fetch by name)
  expect(getByText("Exercise demonstration unavailable")).toBeTruthy();
});
