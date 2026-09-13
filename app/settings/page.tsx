import { getSettings } from '@/lib/data/config';
import { PageHeader } from '@/components/ui';
import { SettingsForm } from '@/components/SettingsForm';
import { resetSettings } from '@/lib/actions/config';

export const revalidate = 3600;

export default async function SettingsPage() {
  const settings = await getSettings();

  return (
    <div className="animate-fade-up mx-auto max-w-3xl p-4 sm:p-6">
      <PageHeader
        title="Settings"
        description="Model weights and portfolio constraints — every change recomputes the models"
        action={
          <form action={resetSettings}>
            <button className="text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
              Reset to defaults
            </button>
          </form>
        }
      />
      {/* key forces re-init of the form state after save/reset revalidation */}
      <SettingsForm key={JSON.stringify(settings)} settings={settings} />
    </div>
  );
}
