import {marketUPulseTime} from '../../receiz/market-projection/coordinates';

const localTime = new Intl.DateTimeFormat(undefined, {
  year:'numeric', month:'short', day:'numeric', hour:'numeric', minute:'2-digit', timeZoneName:'short',
});

function pulseTimestamp(pulse:string|bigint) {
  return marketUPulseTime(String(BigInt(pulse)*1000000n));
}

export function votingTimeLeft(now:bigint, closes:bigint) {
  if(now>=closes)return 'Voting closed';
  const minutes=Math.ceil((pulseTimestamp(closes)-pulseTimestamp(now))/60000);
  if (minutes<=1) return 'Less than a minute left';
  const days=Math.floor(minutes/1440),hours=Math.floor(minutes%1440/60);
  if(days)return `${days}d${hours ? ` ${hours}h` : ''} left`;
  if(hours)return `${hours}h${minutes%60 ? ` ${minutes%60}m` : ''} left`;
  return `${minutes}m left`;
}

export function GovernanceTime({pulse,label}:{pulse:string|bigint;label?:string}) {
  const point = new Date(pulseTimestamp(pulse));
  return <span className="gov-time">
    {label&&<span>{label}</span>}
    {Number.isFinite(point.getTime())&&<time dateTime={point.toISOString()}>{localTime.format(point)}</time>}
    <span className="gov-time-pulse"><span aria-hidden="true">☤</span>{' '}<span className="gov-time-label">Kai pulse </span>{BigInt(pulse).toLocaleString()}</span>
  </span>;
}
