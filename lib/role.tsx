"use client";
import { createContext, useContext } from "react";
import type { Role } from "./roles";

export { ROLES, ROLE_LABEL, isManager } from "./roles";
export type { Role } from "./roles";

const RoleCtx = createContext<Role>("employee");
export const RoleProvider = RoleCtx.Provider;
export const useRole = () => useContext(RoleCtx);
