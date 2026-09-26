import Skeleton from "../../../shared/components/skeleton/Skeleton.jsx";

function FieldSkeleton() {
  return (
    <div className="auth-skeleton__field">
      <Skeleton variant="text" width="32%" height={13} />
      <Skeleton variant="rectangular" width="100%" height={46} radius={17} />
    </div>
  );
}

export default function AuthPageSkeleton({ register = false }) {
  return (
    <main className="auth-page" aria-busy="true" aria-label="Loading form">
      <div className="auth-background" aria-hidden="true" />

      <section
        className={`auth-card${register ? " auth-card--register" : ""} loop-glass-surface`}
      >
        <div className="auth-skeleton__heading" aria-hidden="true">
          <Skeleton variant="text" width={118} height={12} />
          <Skeleton variant="text" width={register ? "68%" : "52%"} height={38} />
          <Skeleton variant="text" width="88%" height={15} />
          <Skeleton variant="text" width="62%" height={15} />
        </div>

        <div className="auth-form auth-skeleton__form" aria-hidden="true">
          {register && (
            <div className="auth-skeleton__stepper">
              <Skeleton variant="circular" width={32} height={32} />
              <Skeleton variant="rectangular" width={56} height={2} radius={1} />
              <Skeleton variant="circular" width={32} height={32} />
            </div>
          )}

          {register ? (
            <>
              <div className="form-row">
                <FieldSkeleton />
                <FieldSkeleton />
              </div>
              <div className="form-row">
                <FieldSkeleton />
                <FieldSkeleton />
              </div>
            </>
          ) : (
            <>
              <FieldSkeleton />
              <FieldSkeleton />
            </>
          )}

          <Skeleton variant="button" width="100%" height={42} radius={999} />
        </div>
      </section>
    </main>
  );
}
