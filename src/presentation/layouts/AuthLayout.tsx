import { Outlet } from "react-router-dom";

const AuthLayout = () => {
  return (
    <main className="grid min-h-dvh place-items-center bg-base-200 p-4 text-base-content sm:p-8">
      <section className="card w-full max-w-md border border-base-300 bg-base-100 shadow-xl">
        <div className="card-body gap-5">
          <div className="badge badge-primary badge-outline">Food Truck</div>
          <Outlet />
        </div>
      </section>
    </main>
  );
};
export default AuthLayout;
