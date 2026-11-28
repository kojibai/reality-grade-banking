import type { NativeCurrencyServicePricingTerms } from '../../../native/receiz/app/lib/wallet/bankNotes/nativeCurrencyServicePricing';

const emptyLiveDuration = { referenceImpressions: '', minimumPulsesPerUnit: '', maximumPulsesPerUnit: '' };
const liveDurationFields = [
  ['referenceImpressions', 'Reference impressions'],
  ['minimumPulsesPerUnit', 'Minimum Kai pulses per credit'],
  ['maximumPulsesPerUnit', 'Maximum Kai pulses per credit'],
] as const;

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
  const duration = value.placementDuration;
  const live = duration?.live;
  const paidBookings = value.pricingBasis === 'paid-bookings';
  return <fieldset className="gov-box gov-form">
    <legend>Venue pricing</legend>
    <label>What sets price and supply
      <select value={paidBookings ? 'paid-bookings' : 'audience'} onChange={event => {
        const {pricingBasis, ...terms} = value;
        onChange(event.currentTarget.value === 'paid-bookings' ? {...terms, pricingBasis: 'paid-bookings',
          automaticIssuance: true, placementDuration: {pulsesPerUnit: duration?.pulsesPerUnit || '165'}} : terms);
      }}>
        <option value="audience">Audience and booking demand</option>
        <option value="paid-bookings">Released time and paid bookings</option>
      </select>
    </label>
    <p>{paidBookings ? 'Released placement time backs new units. Verified paid starts move the quote from the charter’s minimum price. CPM is a comparison metric.'
      : 'Each approved observer supplies a signed observation. New purchases require a current quote.'}</p>
    {!paidBookings && <label className="gov-check"><input type="checkbox" checked={value.automaticIssuance===true}
      onChange={() => {
        const {automaticIssuance,...terms}=value;
        onChange(automaticIssuance ? terms : { ...terms, automaticIssuance:true });
      }} />Issue new credits into Market when verified capacity is available</label>}
    <div className="gov-fields">
      {numericFields.filter(([key]) => !paidBookings || !['unitsPerPlacement','viewsPerPlacement','capacityBasisPoints'].includes(key)).map(([key, label]) => <label key={key}>{paidBookings && key === 'benchmarkUsdCentsPerThousandImpressions' ? 'Reference CPM (USD cents per thousand)' : label}
        <input required value={value[key]} inputMode="numeric" pattern="[1-9][0-9]*" maxLength={19}
          onChange={event => onChange({ ...value, [key]: event.target.value })} />
      </label>)}
    </div>
    <fieldset className="gov-box gov-form">
      <legend>Placement duration</legend>
      {!paidBookings && <label>How credits book time
        <select value={live ? 'live' : duration ? 'fixed' : 'slots'} onChange={event => {
          const mode = event.currentTarget.value;
          const { placementDuration, ...terms } = value;
          if (mode === 'slots') onChange(terms);
          else onChange({ ...terms, placementDuration: {
            pulsesPerUnit: placementDuration?.pulsesPerUnit ?? '',
            ...(mode === 'live' ? { live: placementDuration?.live ?? emptyLiveDuration } : {}),
          } });
        }}>
          <option value="slots">Fixed booking slots</option>
          <option value="fixed">Fixed time per credit</option>
          <option value="live">Live time per credit</option>
        </select>
      </label>}
      {duration && <div className="gov-fields">
        <label>{live ? 'Base Kai pulses per credit' : 'Kai pulses per credit'}
          <input required value={duration.pulsesPerUnit} inputMode="numeric" pattern="[1-9][0-9]*" maxLength={19}
            onChange={event => onChange({ ...value, placementDuration: { ...duration, pulsesPerUnit: event.currentTarget.value } })} />
        </label>
        {live && liveDurationFields.map(([key, label]) => <label key={key}>{label}
          <input required value={live[key]} inputMode="numeric" pattern="[1-9][0-9]*" maxLength={19}
            onChange={event => onChange({ ...value, placementDuration: { ...duration, live: { ...live, [key]: event.currentTarget.value } } })} />
        </label>)}
      </div>}
      {live && <p>Verified venue traffic sets the time each credit buys within these limits.</p>}
    </fieldset>
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
