import { Banknote, CreditCard, Settings2, ShieldCheck, Truck } from "lucide-react";

import { FlashMessage } from "@/components/ui/flash-message";
import { Field, inputClassName, Toggle } from "@/components/ui/form-controls";
import { PageHeader } from "@/components/ui/page-header";
import { InlineNotice, Panel, PanelHeader } from "@/components/ui/panel";
import { SubmitButton } from "@/components/ui/submit-button";
import {
  saveCheckoutSettingsAction,
  saveStoreProfileAction,
} from "@/lib/actions/settings";
import { requirePermission } from "@/lib/auth/admin";
import { getStoreConfiguration } from "@/lib/data/admin-queries";

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ success?: string; error?: string }>;
}) {
  const [params, settings] = await Promise.all([
    searchParams,
    getStoreConfiguration(),
    requirePermission("settings"),
  ]);

  return (
    <div className="grid gap-6">
      <PageHeader
        eyebrow="Store configuration"
        title="Commerce settings"
        description="Control checkout methods, delivery charges, and the public support profile."
      />
      <FlashMessage success={params.success} error={params.error} />
      <InlineNotice>
        Provider secrets never belong in this form. Configure Razorpay credentials only in secure
        server environment variables.
      </InlineNotice>

      <form action={saveCheckoutSettingsAction} className="grid gap-6">
        <Panel>
          <PanelHeader
            title="Payment methods"
            description="At least one checkout method must remain enabled. Amounts are stored as integer paise."
            action={<CreditCard className="size-5 text-amber-600" />}
          />
          <div className="grid gap-4 p-5 lg:grid-cols-3">
            <Toggle
              name="razorpay_enabled"
              label="Online payment"
              description="Razorpay order creation and signed webhook confirmation."
              defaultChecked={settings.onlinePaymentEnabled}
            />
            <Toggle
              name="cod_enabled"
              label="Cash on delivery"
              description="Available only inside the configured order-value range."
              defaultChecked={settings.codEnabled}
            />
            <Toggle
              name="bank_transfer_enabled"
              label="Bank transfer"
              description="Requires customer proof and staff review."
              defaultChecked={settings.bankTransferEnabled}
            />
            <Field label="Razorpay fee (%)">
              <input
                className={inputClassName}
                type="number"
                name="razorpay_fee_percent"
                min={0}
                max={100}
                step="0.01"
                defaultValue={settings.onlinePaymentFeeBps / 100}
              />
            </Field>
            <Field label="COD minimum (INR)">
              <input
                className={inputClassName}
                type="number"
                name="cod_minimum"
                min={0}
                step="0.01"
                defaultValue={settings.codMinimumMinor / 100}
              />
            </Field>
            <Field label="COD maximum (INR)">
              <input
                className={inputClassName}
                type="number"
                name="cod_maximum"
                min={0}
                step="0.01"
                defaultValue={settings.codMaximumMinor / 100}
              />
            </Field>
          </div>
        </Panel>

        <Panel>
          <PanelHeader
            title="Delivery"
            description="The database quotes these values during checkout; the browser never calculates the final total."
            action={<Truck className="size-5 text-amber-600" />}
          />
          <div className="grid gap-4 p-5 md:grid-cols-3">
            <Toggle
              name="free_shipping_enabled"
              label="Free delivery threshold"
              description="Waive the flat charge when the threshold is met."
              defaultChecked={settings.freeShippingEnabled}
            />
            <Field label="Free delivery from (INR)">
              <input
                className={inputClassName}
                type="number"
                name="free_shipping_threshold"
                min={0}
                step="0.01"
                defaultValue={settings.freeShippingThresholdMinor / 100}
              />
            </Field>
            <Field label="Flat delivery charge (INR)">
              <input
                className={inputClassName}
                type="number"
                name="flat_shipping"
                min={0}
                step="0.01"
                defaultValue={settings.flatShippingMinor / 100}
              />
            </Field>
          </div>
        </Panel>

        <div className="flex justify-end">
          <SubmitButton pendingLabel="Saving checkout settings...">
            Save checkout settings
          </SubmitButton>
        </div>
      </form>

      <form action={saveStoreProfileAction} className="grid gap-6">
        <Panel>
          <PanelHeader
            title="Store and support profile"
            description="Public storefront identity and support contact details."
            action={<Settings2 className="size-5 text-amber-600" />}
          />
          <div className="grid gap-4 p-5 md:grid-cols-2 xl:grid-cols-4">
            <Field label="Store name">
              <input
                className={inputClassName}
                name="store_name"
                required
                minLength={2}
                maxLength={120}
                defaultValue={settings.storeName}
              />
            </Field>
            <Field
              label="Currency"
              hint="This release is intentionally INR-only across catalogue, checkout, payments, and invoices."
            >
              <input
                className={inputClassName}
                value="INR"
                readOnly
                aria-readonly="true"
              />
            </Field>
            <Field label="Support email">
              <input
                className={inputClassName}
                type="email"
                name="support_email"
                defaultValue={settings.supportEmail}
              />
            </Field>
            <Field label="Support phone">
              <input
                className={inputClassName}
                type="tel"
                name="support_phone"
                maxLength={30}
                defaultValue={settings.supportPhone}
              />
            </Field>
          </div>
        </Panel>
        <div className="flex justify-end">
          <SubmitButton pendingLabel="Saving store profile...">
            Save store profile
          </SubmitButton>
        </div>
      </form>

      <Panel>
        <PanelHeader
          title="Security model"
          description="Operational roles are managed from Customers & roles."
          action={<ShieldCheck className="size-5 text-amber-600" />}
        />
        <div className="grid gap-3 p-5 text-sm text-slate-600 md:grid-cols-3">
          <p className="rounded-xl bg-slate-50 p-4">
            <Banknote className="mb-2 size-4 text-amber-600" />
            Payment capture and refunds are provider- or database-controlled.
          </p>
          <p className="rounded-xl bg-slate-50 p-4">
            <ShieldCheck className="mb-2 size-4 text-amber-600" />
            Role grants and suspensions run through guarded functions.
          </p>
          <p className="rounded-xl bg-slate-50 p-4">
            <Settings2 className="mb-2 size-4 text-amber-600" />
            Protected row changes are written to the immutable audit log.
          </p>
        </div>
      </Panel>
    </div>
  );
}
