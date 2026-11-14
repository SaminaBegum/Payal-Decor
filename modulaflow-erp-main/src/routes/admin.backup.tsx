import { useNavigate } from "react-router-dom";

function AdminPage() {
  const navigate = useNavigate();

  const openUsers = () => { alert("Users clicked");
    navigate("/admin/users");
  };

  return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold">Admin</h1>
          <p className="text-muted-foreground">
            Manage system settings, users, roles and module configuration.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">

          <button
            type="button"
            onClick={openUsers}
            className="rounded-lg border p-5 text-left transition hover:bg-muted/50"
          >
            <h2 className="font-semibold">Users</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Manage system users.
            </p>
          </button>

          <div className="rounded-lg border p-5">
            <h2 className="font-semibold">Roles & Permissions</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Manage roles and permissions.
            </p>
          </div>

          <div className="rounded-lg border p-5">
            <h2 className="font-semibold">Module Settings</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Configure module settings.
            </p>
          </div>

          <div className="rounded-lg border p-5">
            <h2 className="font-semibold">System Settings</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Manage system configuration.
            </p>
          </div>

        </div>
      </div>
  );
}

export default AdminPage;
