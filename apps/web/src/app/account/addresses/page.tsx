import {
  Button,
  Card,
  CardContent,
  Input,
  Label,
} from "@babascamera/ui";
import {
  addAddressAction,
  removeAddressAction,
  setDefaultAddressAction,
} from "@/app/actions/account";
import { requireUser } from "@/lib/auth/session";
import { listUserAddresses } from "@/lib/data/storefront";
import { ActionForm } from "@/components/action-form";

export const metadata = { title: "Addresses" };
export const dynamic = "force-dynamic";

export default async function AddressesPage() {
  const user = await requireUser("/account/addresses");
  const addresses = await listUserAddresses(user.id);
  return (
    <section>
      <h1 className="text-3xl font-bold">Addresses</h1>
      <p className="mt-2 text-slate-600">
        Select a default address or add a new delivery location.
      </p>
      <div className="mt-7 grid gap-4 md:grid-cols-2">
        {addresses.map((address) => (
          <Card key={address.id}>
            <CardContent className="p-5">
              <div className="flex items-center justify-between gap-3">
                <p className="font-semibold">{address.label}</p>
                {address.isDefault ? (
                  <span className="rounded-full bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700">
                    Default
                  </span>
                ) : null}
              </div>
              <address className="mt-3 text-sm not-italic leading-6 text-slate-600">
                {address.line1}
                {address.line2 ? `, ${address.line2}` : ""}
                <br />
                {address.city}, {address.state} {address.pincode}
                <br />
                {address.country}
              </address>
              <div className="mt-4 flex gap-2">
                {!address.isDefault ? (
                  <ActionForm action={setDefaultAddressAction}>
                    <input
                      type="hidden"
                      name="addressId"
                      value={address.id}
                    />
                    <Button type="submit" size="sm" variant="outline">
                      Make default
                    </Button>
                  </ActionForm>
                ) : null}
                <ActionForm action={removeAddressAction}>
                  <input type="hidden" name="addressId" value={address.id} />
                  <Button type="submit" size="sm" variant="ghost">
                    Remove
                  </Button>
                </ActionForm>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="mt-8">
        <CardContent className="p-6">
          <h2 className="text-xl font-bold">Add an address</h2>
          <ActionForm
            action={addAddressAction}
            className="mt-5 grid gap-4 sm:grid-cols-2"
            showMessage
            resetOnSuccess
          >
            {[
              ["label", "Label", "Home"],
              ["line1", "Address line 1", "Building and street"],
              ["line2", "Address line 2", "Landmark (optional)"],
              ["city", "City", "Kochi"],
              ["state", "State", "Kerala"],
              ["pincode", "PIN code", "682001"],
              ["country", "Country", "India"],
            ].map(([name, label, placeholder]) => (
              <div
                key={name}
                className={name === "line1" || name === "line2" ? "sm:col-span-2" : ""}
              >
                <Label htmlFor={name}>{label}</Label>
                <Input
                  id={name}
                  name={name}
                  placeholder={placeholder}
                  defaultValue={name === "country" ? "India" : undefined}
                  required={name !== "line2"}
                  className="mt-2"
                />
              </div>
            ))}
            <label className="flex items-center gap-2 text-sm sm:col-span-2">
              <input type="checkbox" name="isDefault" />
              Use as my default delivery address
            </label>
            <div className="sm:col-span-2">
              <Button
                type="submit"
                className="bg-[#E94560] hover:bg-[#D63852]"
              >
                Save address
              </Button>
            </div>
          </ActionForm>
        </CardContent>
      </Card>
    </section>
  );
}
