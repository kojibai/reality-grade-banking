import type { NativeCurrencyServicePricingTerms } from '../../../native/receiz/app/lib/wallet/bankNotes/nativeCurrencyServicePricing';

const emptyVenue = { id: '', observerReceizId: '', dailyEligibleViewsLimit: '' };
export const emptyVenuePricingTerms: NativeCurrencyServicePricingTerms = {
  unitsPerPlacement: '100', viewsPerPlacement: '1000', capacityBasisPoints: '8000',
  bookingWindowDays: '90', benchmarkUsdCentsPerThousandImpressions: '2500',
  windowLengthKai: '17491', maximumAgeKai: '17491', venues: [emptyVenue],
};

const numericFields = [
  ['unitsPerPlacement', 'Credits per placement'],
  ['viewsPerPlacement', 'Qualified views budget per placement'],
  ['capacityBasisPoints', 'Audience capacity (basis points)'],
  ['bookingWindowDays', 'Booking window (days)'],
  ['benchmarkUsdCentsPerThousandImpressions', 'Benchmark (USD cents per thousand impressions)'],
  ['windowLengthKai', 'Observation window (Kai pulses)'],
  ['maximumAgeKai', 'Maximum observation age (Kai pulses)'],
] as const;

export function VenuePricingFields({ value, onChange }: {
  value: NativeCurrencyServicePricingTerms;
  onChange(value: NativeCurrencyServicePricingTerms): void;
}) {
  return <fieldset className="gov-box gov-form">
    <legend>Venue pricing</legend>
    <p>Each approved observer supplies a signed observation. New purchases require a current quote.</p>
    <label className="gov-check"><input type="checkbox" checked={value.automaticIssuance===true}
      onChange={() => {
        const {automaticIssuance,...terms}=value;
        onChange(automaticIssuance ? terms : { ...terms, automaticIssuance:true });
      }} />Issue new credits into Market when verified capacity is available</label>
    <div className="gov-fields">
      {numericFields.map(([key, label]) => <label key={key}>{label}
        <input required value={value[key]} inputMode="numeric" pattern="[1-9][0-9]*" maxLength={19}
          onChange={event => onChange({ ...value, [key]: event.target.value })} />
      </label>)}
    </div>
    {value.venues.map((venue, index) => {
      const fields = [
        ['id', 'Venue identifier', '[a-z0-9][a-z0-9\\-]*', 64],
        ['observerReceizId', 'Observation signer’s Receiz ID', undefined, 256],
        ['dailyEligibleViewsLimit', 'Daily qualified views limit', '[1-9][0-9]*', 19],
      ] as const;
      return <fieldset className="gov-box gov-form" key={index}>
        <legend>{venue.id || 'Venue'}</legend>
        {fields.map(([key, label, pattern, maxLength]) => <label key={key}>{label}
          <input required value={venue[key]} pattern={pattern} maxLength={maxLength}
            inputMode={key === 'dailyEligibleViewsLimit' ? 'numeric' : undefined}
            onChange={event => onChange({ ...value, venues: value.venues.map((entry, position) =>
              position === index ? { ...entry, [key]: event.target.value } : entry) })} />
        </label>)}
        {value.venues.length > 1 && <button type="button" className="gov-link"
          onClick={() => onChange({ ...value, venues: value.venues.filter((_, position) => position !== index) })}>Remove venue</button>}
      </fieldset>;
    })}
    {value.venues.length < 32 && <button type="button" className="gov-link"
      onClick={() => onChange({ ...value, venues: [...value.venues, emptyVenue] })}>Add venue</button>}
  </fieldset>;
}
