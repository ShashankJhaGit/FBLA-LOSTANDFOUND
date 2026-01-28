import { createRootRoute, Outlet } from "@tanstack/react-router";
import { ErrorBoundary } from "../components/ErrorBoundary";
import { FloatingBanner } from "../components/FloatingBanner";

export const Route = createRootRoute({
    component: Root,
});

function Root() {
    return (
        <div className="flex flex-col min-h-screen">
            <ErrorBoundary tagName="main" className="flex-1">
                <Outlet />
            </ErrorBoundary>
            <FloatingBanner position="bottom-left" />
        </div>
    );
}