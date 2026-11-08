import {PublicDocumentFormatContext,PublicDocumentPulseContext} from '../../core/public-document-format';
import {profileUsernameLabel} from '../../receiz/account-name';
import {retainPublicAsset} from '../../receiz/public-asset-page';
import {useContext,useEffect,useState,useSyncExternalStore} from 'react';
import { ExternalLink, FileCheck2 } from 'lucide-react';
import {PublicObjectArtwork} from './PublicObjectRow';
import {OpenInvestment} from '../assets/OpenInvestment';
import {formatMoney} from '../../core/money';
import {compatibleShareInventory,marketCapitalizationQuantity,shareCapitalizationUsdCents} from '../../receiz/market-share-inventory';
import {ShareInventory} from './ShareInventory';
import {PublicAssetChart} from './PublicAssetChart';
import {usePublicAssetPeriods} from '../../receiz/market-projection/usePublicAssetPeriods';
import { formatPublicPrice,publicAssetImagePreviewUrl,safeReceizArtworkUrl, type PublicMarketItem } from '../../receiz/public-market';
import {ProofMedia,PublicImageDialog} from '../media/ProofMedia';
import {ProofImageCanvas} from '../media/ProofImageCanvas';
import {ProofCaption} from '../media/ProofCaption';
import {MomentCard} from '../media/MomentCard';
import {fetchPublicCardDetails,type PublicCardDetails} from '../../receiz/public-card-details';
import {AssetPageLinks} from '../../components/AssetPageLinks';
import {AssetObject} from '../media/AssetObject';
import {AssetProofBack} from '../media/AssetProofBack';
import {marketContentLabel} from '../../receiz/market-categories';
import {profilePagePath,profileUsername,retainedPublicProfile,subscribePublicProfiles} from '../../receiz/public-profile';
import {AccountProfileLink} from '../../components/AccountProfileLink';
import {PublicOwnerAvatar} from '../../public-explorer/PublicOwnerAvatar';
import {PublicCollectibleArtwork} from '../collectibles/PublicCollectibleArtwork';
import {admittedAssetPublicationItem} from '../../receiz/asset-publication-adoption';

export function PublicAssetDetail({ item, onTrade,readOnly=false,standalone=false }: { item: PublicMarketItem; onTrade?: (mode: 'buy' | 'sell', digest: string) => void;readOnly?:boolean;standalone?:boolean }) {
  const format=useContext(PublicDocumentFormatContext),firstFrame=useContext(PublicDocumentPulseContext)!==undefined;
  const owner=profileUsername(item.ownerUsername),profile=useSyncExternalStore(subscribePublicProfiles,()=>owner?retainedPublicProfile(owner):null,()=>null);
  // A selected local row may predate its owner's carried public metadata.
  // Reuse that same admission's current display without resolving it again.
  const canonicalOwnerUid=item.ownerIdentity?.userId,ownerUid=canonicalOwnerUid??item.admittedOwnerUserId,ownerProfile=!ownerUid||profile?.userId===ownerUid?profile:null;
  const carried=ownerUid?ownerProfile?.items.find(value=>value.id===item.id&&value.assetId===item.assetId&&value.originalDigest===item.originalDigest)??null:null;
  const admission=owner&&item.originalDigest?admittedAssetPublicationItem(item.originalDigest,owner,ownerUid):null;
  const local=admission?.id===item.id&&admission.assetId===item.assetId?admission:item.admittedOwnerUserId?carried:null;
  const ownerAvatar=canonicalOwnerUid&&item.ownerAvatarUrl!==undefined?item.ownerAvatarUrl
    :local&&ownerProfile?ownerProfile.avatarUrl:local?.ownerAvatarUrl?local.ownerAvatarUrl:item.ownerAvatarUrl===undefined?ownerProfile?.avatarUrl:item.ownerAvatarUrl;
  const verifyUrl=local?.verifyUrl&&(!item.verifyUrl||new URL(local.verifyUrl).searchParams.has('c'))?local.verifyUrl:item.verifyUrl;
  const readingUrl=local&&verifyUrl===local.verifyUrl?local.readingUrl:item.readingUrl;
  const [publicDetails,setPublicDetails]=useState<{source:string;details:PublicCardDetails}|null>(null);
  useEffect(()=>{if(item.category!=='sports'||!item.sourceUrl||item.sealedCopies?.length)return;const controller=new AbortController();void fetchPublicCardDetails(item,controller.signal).then(details=>{if(!controller.signal.aborted)setPublicDetails({source:item.sourceUrl!,details});}).catch(()=>{});return()=>controller.abort();},[item.category,item.assetId,item.sourceUrl,item.sealedCopies]);
  const canReviewTrade=!!onTrade&&!item.id.startsWith('sports:');
  const details=!item.sealedCopies?.length&&publicDetails?.source===item.sourceUrl?publicDetails.details:item;
  const multipleCopies=item.category==='sports'&&(item.circulationCount??1)>1;
  const periods=usePublicAssetPeriods(item),[metric,setMetric]=useState<'value'|'cap'>('value');
  const current=periods?.ALL.at(-1),price=current?Number(current.usdCents)/100:item.priceUsd;
  const inventory=compatibleShareInventory(item,item.shareInventory),quantity=inventory?marketCapitalizationQuantity(inventory):null,cap=quantity!==null&&price!==null&&Number.isSafeInteger(Math.round(price*100))?shareCapitalizationUsdCents(String(Math.round(price*100)),quantity):null,showCap=metric==='cap'&&!!inventory,headline=showCap?(cap===null?'—':formatMoney(cap)):formatPublicPrice(price);
  const [publicImageOpen,setPublicImageOpen]=useState(false),publicImage=publicAssetImagePreviewUrl(item);
  const media=item.originalUrl&&item.originalDigest?<ProofMedia carriedText={item.carriedText} publicBook={item.book} allowMediaDownload={item.mediaKind!=='epub'} publicDocument={item.documentUrl?{url:item.documentUrl,assetId:item.assetId}:null} publicAudio={item.mediaKind==='audio'&&item.playback?{...item.playback,assetId:item.assetId}:null} publicVideo={item.mediaKind==='video'&&item.playback?{...item.playback,assetId:item.assetId}:null} artworkUrl={item.artworkUrl} publicImageUrl={publicImage} autoOpen={standalone&&!firstFrame} key={[item.originalDigest,item.originalUrl,readingUrl??verifyUrl].join(':')} title={item.title} source={{kind:"public",url:item.originalUrl,digest:item.originalDigest,...(verifyUrl?{postUrl:readingUrl??verifyUrl,hasLongForm:item.hasLongForm}:{})}}/>:publicImage?<section className="proof-media"><div className="proof-media-topline"><span>Image</span><span>Public image</span></div><div className="proof-object-stage has-depth"><div className="proof-object-face"><ProofImageCanvas url={publicImage} label={item.title} expanded={false} prioritize={standalone} onExpand={()=>setPublicImageOpen(true)}/></div></div></section>:null;
  const collectibleArtwork=item.category==='sports'?safeReceizArtworkUrl(item.artworkUrl):null;
  const object=<AssetObject key={item.id} label={item.title} front={media??(collectibleArtwork?<PublicCollectibleArtwork item={item} eager/>:item.mediaKind==='moment'?<div className="public-collectible-moment"><MomentCard item={item}/></div>:<div className="public-collectible-face"><span>{marketContentLabel(item)}</span><h2>{item.title}</h2><p>{item.summary}</p><code>{item.assetId}</code><small>Public source presentation</small></div>)} renderBack={()=> <AssetProofBack item={item}/>}/>;
  return <><div className="asset-detail-heading"><PublicObjectArtwork item={item} artworkUrl={item.artworkUrl}/><div><h1>{item.title}</h1><p>{standalone?'Source. Ownership. Continuity.':'Public source'}</p></div></div>
    {publicImageOpen&&publicImage&&<PublicImageDialog title={item.title} url={publicImage} onClose={()=>setPublicImageOpen(false)}/>}
    {standalone&&owner&&<a className="asset-profile-byline" href={profilePagePath(owner)}><PublicOwnerAvatar item={admission?item:carried??item} src={ownerAvatar} name={item.ownerDisplayName??owner} eager/><span>Owner<span>@{profileUsernameLabel(owner)}</span></span><ExternalLink size={13}/></a>}
    {!standalone&&<AssetPageLinks item={item}/>}
    {standalone&&<div className="public-asset-media">{object}</div>}
    <div className="asset-price public-asset-price"><strong className="asset-price-amount" style={{fontSize:`min(35px, calc((100cqw - 92px) / ${Math.max(1,headline.length*.55)}))`}}>{headline}</strong><span>{showCap?'Market cap':'Market Value'}</span></div>
    {!periods&&item.changePct !== null && <div className={`price-change ${item.changePct >= 0 ? 'positive' : 'negative'}`}>{item.changePct > 0 ? '+' : ''}{item.changePct}%</div>}
    <PublicAssetChart periods={periods} fallback={item.chart} item={item} inventory={item.category==='sports'?undefined:inventory} metric={metric} onMetricChange={setMetric}/><ShareInventory item={item} priceUsd={price}/>
    {!readOnly&&<div className="dual-actions"><button className="primary-button" disabled={!canReviewTrade} onClick={() => { retainPublicAsset(item);onTrade?.('buy', item.id); }}>Buy ownership</button><button className="secondary-button" disabled={!canReviewTrade} onClick={() => { retainPublicAsset(item);onTrade?.('sell', item.id); }}>Take cash</button></div>}
    <OpenInvestment item={item}/>
    {!readOnly&&<details className="transaction-proof-details asset-trade-terms"><summary>Ownership &amp; payment</summary><p className="body-copy small-copy">Inspect the Original for what is included and any use or delivery terms. Your approved trade records the ownership units bought or sold. A completed sale credits the seller’s proceeds to their account; the source and ownership history stay connected.</p></details>}
    {!standalone&&object}
    <div className="asset-actions asset-source-links">{item.sourceUrl && <a href={item.sourceUrl} target="_blank" rel="noreferrer"><ExternalLink size={15} strokeWidth={1.5} />Open public source</a>}{verifyUrl && <a href={verifyUrl} target="_blank" rel="noreferrer"><FileCheck2 size={15} strokeWidth={1.5} />Inspect proof</a>}</div>
    {item.summary&&<ProofCaption caption={item.summary}/>}
    {item.originalCreator&&<div className="detail-list"><div><span>Creator</span><strong>{item.originalCreator.username?<AccountProfileLink username={item.originalCreator.username}>@{profileUsernameLabel(item.originalCreator.username)}</AccountProfileLink>:item.originalCreator.displayName??item.originalCreator.userId??'Not supplied'}</strong></div></div>}
    <div className="detail-list"><div><span>Owner</span><strong>{multipleCopies ? 'Varies by copy · open public source' : details.ownerUsername ? <AccountProfileLink username={details.ownerUsername}>@{profileUsernameLabel(details.ownerUsername)}</AccountProfileLink> : details.ownerDisplayName ?? 'Not supplied by the public source'}</strong></div><div><span>Object</span><strong className="proof-coordinate">{item.assetId}</strong></div><div><span>Sealed</span><strong>{multipleCopies ? 'Varies by copy' : details.sealedAt ? new Date(details.sealedAt).toLocaleString(format?.locale,{timeZone:format?.timeZone}) : 'Not supplied'}</strong></div>{item.pulse && <div><span>☤KAI</span><strong>{item.pulse}</strong></div>}</div>
    {multipleCopies&&item.sealedCopies?.length&&<details className="market-copy-details"><summary>{item.sealedCopies.length.toLocaleString()} sealed copies · owners and times</summary>{item.sealedCopies.map(copy=><div className="detail-list" key={`${copy.collectibleId}:${copy.claimHash}`}><div><span>Owner</span><strong>{copy.ownerUsername?<AccountProfileLink username={copy.ownerUsername}>@{profileUsernameLabel(copy.ownerUsername)}</AccountProfileLink>:copy.ownerDisplayName??'Not supplied'}</strong></div><div><span>Sealed</span><strong>{new Date(copy.sealedAt).toLocaleString(format?.locale,{timeZone:format?.timeZone})}</strong></div><div><span>Copy</span><strong className="proof-coordinate">{copy.collectibleId}</strong></div></div>)}</details>}
    <p className="body-copy small-copy">{readOnly?'Values follow the public object’s pricing inputs. Open its original source to inspect the carried evidence.':'Explore public asset values here. Review the current quote, budget or quantity before approving a live Market trade.'}</p>
  </>;
}
