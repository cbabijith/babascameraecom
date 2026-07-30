import { Button, Card, CardContent, Input, Label } from "@babascamera/ui";
import { updateProfileAction } from "@/app/actions/account";
import { requireUser } from "@/lib/auth/session";
import { getUserProfile } from "@/lib/data/storefront";
import { AvatarUrlField } from "@/components/account/avatar-url-field";
import { ActionForm } from "@/components/action-form";

export const metadata = { title: "Profile" };
export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const user = await requireUser("/account/profile");
  const profile = await getUserProfile(user.id);
  return (
    <section>
      <h1 className="text-3xl font-bold">Profile</h1>
      <p className="mt-2 text-slate-600">
        Keep your contact details current for order updates.
      </p>
      <Card className="mt-7 max-w-2xl">
        <CardContent className="p-6">
          <ActionForm
            action={updateProfileAction}
            className="space-y-5"
            showMessage
          >
            <div>
              <Label htmlFor="fullName">Full name</Label>
              <Input
                id="fullName"
                name="fullName"
                defaultValue={
                  profile?.fullName ??
                  (typeof user.user_metadata.full_name === "string"
                    ? user.user_metadata.full_name
                    : "")
                }
                required
                minLength={2}
                className="mt-2"
              />
            </div>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                value={profile?.email ?? user.email ?? ""}
                readOnly
                className="mt-2 bg-slate-50"
              />
            </div>
            <div>
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                name="phone"
                type="tel"
                defaultValue={profile?.phone ?? ""}
                autoComplete="tel"
                className="mt-2"
              />
            </div>
            <AvatarUrlField
              defaultValue={
                profile?.avatarUrl ??
                (typeof user.user_metadata.avatar_url === "string"
                  ? user.user_metadata.avatar_url
                  : "")
              }
            />
            <Button
              type="submit"
              className="bg-[#E94560] hover:bg-[#D63852]"
            >
              Save profile
            </Button>
          </ActionForm>
        </CardContent>
      </Card>
    </section>
  );
}
