const adminUsers = [
  { name: "Admin", email: "admin@gmail.com" },
];

export default function AdminUsersPage() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Admin Users</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {adminUsers.map((user, index) => (
          <div
            key={index}
            className="glass-card p-6 flex flex-col gap-4 smooth-transition hover:glow-primary group cursor-pointer"
          >
            {/* Avatar + Info */}
            <div className="flex items-center gap-4">
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg text-white flex-shrink-0"
                style={{
                  background: "linear-gradient(135deg, #7C3AED, #06B6D4)",
                  boxShadow: "0 0 16px rgba(124, 58, 237, 0.5)",
                }}
              >
                {user.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="text-base font-semibold text-foreground">{user.name}</p>
                <p className="text-sm text-muted-foreground">{user.email}</p>
              </div>
            </div>

            {/* Divider */}
            <div className="border-t border-border" />

            {/* Badge */}
            <div className="flex items-center justify-between">
              <span
                className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-full"
                style={{
                  background: "rgba(124, 58, 237, 0.15)",
                  color: "#a78bfa",
                  border: "1px solid rgba(124, 58, 237, 0.3)",
                }}
              >
                <span
                  className="w-1.5 h-1.5 rounded-full"
                  style={{ background: "#7C3AED" }}
                />
                Administrator
              </span>

              <span
                className="text-xs px-2 py-1 rounded-full"
                style={{
                  background: "rgba(6, 182, 212, 0.1)",
                  color: "#06B6D4",
                  border: "1px solid rgba(6, 182, 212, 0.2)",
                }}
              >
                Active
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

