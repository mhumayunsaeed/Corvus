// Public API of the auth feature. Import from "@/features/auth" — never from
// deep paths inside this folder.
export * from "./components";
export { useAuthStore, type User } from "./store/auth-store";
export * from "./api/auth";
