/// <reference types="expo/types" />

// Expo's web bundler supports importing CSS for its side effects; TypeScript
// needs telling that such an import produces no value.
declare module '*.css';
