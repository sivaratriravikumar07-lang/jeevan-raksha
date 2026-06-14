import { NavLink } from "react-router-dom";
import { Home, Users, History, User, BookOpen } from "lucide-react";

const items = [
  { to: "/dashboard", label: "Home", icon: Home },
  { to: "/contacts", label: "Contacts", icon: Users },
  { to: "/history", label: "History", icon: History },
  { to: "/safety-tips", label: "Tips", icon: BookOpen },
  { to: "/profile", label: "Profile", icon: User },
];

export const BottomNav = () => (
  <nav className="fixed bottom-0 left-0 right-0 z-40 bg-card/95 backdrop-blur border-t border-border">
    <div className="container max-w-md grid grid-cols-5">
      {items.map(({ to, label, icon: Icon }) => (
        <NavLink
          key={to}
          to={to}
          end
          className={({ isActive }) =>
            `flex flex-col items-center justify-center py-2.5 text-[10px] font-medium transition-colors ${
              isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
            }`
          }
        >
          <Icon className="w-5 h-5 mb-0.5" />
          {label}
        </NavLink>
      ))}
    </div>
  </nav>
);
