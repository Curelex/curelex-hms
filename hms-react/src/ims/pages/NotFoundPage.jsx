import { Link } from "react-router-dom";

const NotFoundPage = () => {
  return (
    <div className="grid min-h-[70vh] place-items-center text-center">
      <div>
        <p className="text-sm uppercase tracking-widest text-brand-600">404</p>
        <h1 className="mt-2 text-3xl font-semibold text-slate-900">Page not found</h1>
        <Link to="dashboard" className="mt-4 inline-flex rounded-lg bg-brand-600 px-4 py-2 text-white">
          Back to dashboard
        </Link>
      </div>
    </div>
  );
};

export default NotFoundPage;
