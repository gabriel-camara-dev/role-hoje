// Vitest runs with `globals: true` (describe/it/expect are ambient).
// Referenced here instead of via compilerOptions.types because this tsconfig
// sets an explicit `typeRoots`, which makes `types: ["vitest/globals"]` resolve
// against the type roots (@types/vitest/globals) and fail.
/// <reference types="vitest/globals" />
