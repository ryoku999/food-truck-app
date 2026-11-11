import { Outlet } from "react-router-dom";
import ThemeSelector from "../components/ThemeSelector";

const AuthLayout = () => {
  return (
    <main className="grid min-h-dvh place-items-center bg-base-200 p-4 text-base-content sm:p-8">
      <section className="card w-full max-w-md border border-base-300 bg-base-100 shadow-xl">
        <div className="card-body gap-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <img
              src="/logo.png"
              alt="Food Truck"
              width={56}
              height={56}
              className="size-14 object-contain"
            />
            <ThemeSelector />
          </div>
          <Outlet />
        </div>
      </section>
    </main>
  );
};
export default AuthLayout;
