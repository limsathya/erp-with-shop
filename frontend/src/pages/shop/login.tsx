import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Loader2, Store } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useShopAuth } from "@/context/shop-auth-context";
import { shopApiError } from "@/lib/shop-api";

export default function ShopLoginPage() {
  const { login, register } = useShopAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState("login");

  const [loginForm, setLoginForm] = useState({ email: "", password: "" });
  const [regForm, setRegForm] = useState({
    name: "", email: "", phone: "", password: "",
  });

  const setLogin = (k: keyof typeof loginForm) =>
    (e: React.ChangeEvent<HTMLInputElement>) =>
      setLoginForm((f) => ({ ...f, [k]: e.target.value }));

  const setReg = (k: keyof typeof regForm) =>
    (e: React.ChangeEvent<HTMLInputElement>) =>
      setRegForm((f) => ({ ...f, [k]: e.target.value }));

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(loginForm.email, loginForm.password);
      toast.success("Welcome back!");
      navigate(-1);
    } catch (err) {
      toast.error(shopApiError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await register(
        regForm.name,
        regForm.email,
        regForm.password,
        regForm.phone || undefined
      );
      toast.success("Account created! Welcome.");
      navigate(-1);
    } catch (err) {
      toast.error(shopApiError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-sm py-8">
      {/* Header */}
      <div className="mb-6 text-center">
        <Store className="mx-auto mb-2 h-8 w-8 text-primary" />
        <h1 className="text-xl font-bold">Your Account</h1>
        <p className="text-sm text-muted-foreground">
          Sign in or create an account to track your orders
        </p>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="login">Sign In</TabsTrigger>
          <TabsTrigger value="register">Create Account</TabsTrigger>
        </TabsList>

        {/* ── Sign in ── */}
        <TabsContent value="login">
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-base">Sign in</CardTitle>
              <CardDescription>
                Access your orders and saved details
              </CardDescription>
            </CardHeader>
            <form onSubmit={handleLogin}>
              <CardContent className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="login-email">Email</Label>
                  <Input
                    id="login-email"
                    type="email"
                    required
                    autoComplete="email"
                    value={loginForm.email}
                    onChange={setLogin("email")}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="login-password">Password</Label>
                  <Input
                    id="login-password"
                    type="password"
                    required
                    autoComplete="current-password"
                    value={loginForm.password}
                    onChange={setLogin("password")}
                  />
                </div>
              </CardContent>
              <CardFooter className="flex-col gap-2">
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                  Sign In
                </Button>
                <p className="text-xs text-muted-foreground">
                  No account?{" "}
                  <button
                    type="button"
                    onClick={() => setTab("register")}
                    className="text-primary hover:underline"
                  >
                    Create one
                  </button>
                </p>
              </CardFooter>
            </form>
          </Card>
        </TabsContent>

        {/* ── Register ── */}
        <TabsContent value="register">
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-base">Create an account</CardTitle>
              <CardDescription>
                Track orders and check out faster next time
              </CardDescription>
            </CardHeader>
            <form onSubmit={handleRegister}>
              <CardContent className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="reg-name">Full name *</Label>
                  <Input
                    id="reg-name"
                    required
                    autoComplete="name"
                    value={regForm.name}
                    onChange={setReg("name")}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="reg-email">Email *</Label>
                  <Input
                    id="reg-email"
                    type="email"
                    required
                    autoComplete="email"
                    value={regForm.email}
                    onChange={setReg("email")}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="reg-phone">Phone</Label>
                  <Input
                    id="reg-phone"
                    type="tel"
                    autoComplete="tel"
                    placeholder="+855 xx xxx xxx"
                    value={regForm.phone}
                    onChange={setReg("phone")}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="reg-password">Password *</Label>
                  <Input
                    id="reg-password"
                    type="password"
                    required
                    minLength={6}
                    autoComplete="new-password"
                    value={regForm.password}
                    onChange={setReg("password")}
                  />
                </div>
              </CardContent>
              <CardFooter>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                  Create Account
                </Button>
              </CardFooter>
            </form>
          </Card>
        </TabsContent>
      </Tabs>

      <p className="mt-4 text-center text-xs text-muted-foreground">
        <Link to="/shop/cart" className="text-primary hover:underline">
          ← Back to cart
        </Link>
        <span className="mx-2">·</span>
        <Link to="/shop" className="hover:underline">
          Continue as guest
        </Link>
      </p>
    </div>
  );
}
