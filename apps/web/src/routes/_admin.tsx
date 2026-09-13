import { Outlet, createFileRoute } from "@tanstack/react-router";
import AdminLayout from "@/components/layout/admin-layout";

export const Route = createFileRoute("/_admin")({
  component: AdminLayout,
});
