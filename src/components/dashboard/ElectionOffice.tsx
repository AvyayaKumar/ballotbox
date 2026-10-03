import * as React from 'react';
import { Mail, Phone, MapPin, Clock } from 'lucide-react';
import type { AdministrationBody, Jurisdiction, LinkItem, PostalAddress } from '@/lib/types';
import { LinkList } from './LinkList';

function formatPostal(addr: PostalAddress | undefined): string | null {
  if (!addr) return null;
  const parts = [addr.locationName, addr.line1, addr.line2, addr.line3, [addr.city, addr.state].filter(Boolean).join(', '), addr.zip]
    .map((p) => p?.trim())
    .filter(Boolean);
  return parts.length ? parts.join(', ') : null;
}

export function bodyLinks(body: AdministrationBody | undefined): LinkItem[] {
  if (!body) return [];
  const items: Array<[string | undefined, string]> = [
    [body.electionInfoUrl, 'Election information'],
    [body.votingLocationFinderUrl, 'Official location finder'],
    [body.ballotInfoUrl, 'Your ballot'],
    [body.electionRegistrationConfirmationUrl, 'Check registration'],
    [body.electionRegistrationUrl, 'Register to vote'],
    [body.absenteeVotingInfoUrl, 'Absentee & mail voting'],
    [body.electionRulesUrl, 'Election rules'],
    [body.electionNoticeUrl, 'Election notice'],
  ];
  const seen = new Set<string>();
  const out: LinkItem[] = [];
  for (const [href, label] of items) {
    if (!href || seen.has(href)) continue;
    seen.add(href);
    out.push({ label, href, official: true });
  }
  return out;
}

const OfficeBlock: React.FC<{ title: string; jurisdiction: Jurisdiction }> = ({ title, jurisdiction }) => {
  const body = jurisdiction.body;
  const physical = formatPostal(body?.physicalAddress);
  const mailing = formatPostal(body?.correspondenceAddress);
  const official = body?.electionOfficials?.find((o) => o.officePhoneNumber || o.emailAddress);
  const links = bodyLinks(body);
  const displayName = body?.name && body.name.toLowerCase() !== jurisdiction.name.toLowerCase() ? body.name : jurisdiction.name;

  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-widest text-gray-500 mb-1">{title}</p>
      <p className="font-semibold text-gray-900">{displayName}</p>
      {body?.name && displayName !== body.name && <p className="text-sm text-gray-600">{body.name}</p>}
      {body?.electionNoticeText && (
        <p className="mt-2 text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">{body.electionNoticeText}</p>
      )}
      <ul className="mt-2 space-y-1 text-sm text-gray-700">
        {physical && (
          <li className="flex items-start gap-2">
            <MapPin className="h-4 w-4 mt-0.5 text-gray-400 shrink-0" aria-hidden="true" />
            <span>{physical}</span>
          </li>
        )}
        {mailing && mailing !== physical && (
          <li className="flex items-start gap-2">
            <Mail className="h-4 w-4 mt-0.5 text-gray-400 shrink-0" aria-hidden="true" />
            <span>Mail: {mailing}</span>
          </li>
        )}
        {official?.officePhoneNumber && (
          <li className="flex items-start gap-2">
            <Phone className="h-4 w-4 mt-0.5 text-gray-400 shrink-0" aria-hidden="true" />
            <a href={`tel:${official.officePhoneNumber.replace(/[^\d+]/g, '')}`} className="hover:text-brand-accent">
              {official.officePhoneNumber}
            </a>
          </li>
        )}
        {official?.emailAddress && (
          <li className="flex items-start gap-2">
            <Mail className="h-4 w-4 mt-0.5 text-gray-400 shrink-0" aria-hidden="true" />
            <a href={`mailto:${official.emailAddress}`} className="hover:text-brand-accent break-all">
              {official.emailAddress}
            </a>
          </li>
        )}
        {body?.hoursOfOperation && (
          <li className="flex items-start gap-2">
            <Clock className="h-4 w-4 mt-0.5 text-gray-400 shrink-0" aria-hidden="true" />
            <span>{body.hoursOfOperation}</span>
          </li>
        )}
      </ul>
      {links.length > 0 && <LinkList links={links} compact className="mt-3" />}
    </div>
  );
};

export interface ElectionOfficeProps {
  state?: Jurisdiction;
  local?: Jurisdiction;
}

/** The government bodies that run this election for the voter: the state office and the local registrar. */
export const ElectionOffice: React.FC<ElectionOfficeProps> = ({ state, local }) => {
  const hasState = state && (state.body || state.name);
  const hasLocal = local && (local.body || local.name);
  if (!hasState && !hasLocal) return null;
  return (
    <div className="grid gap-6 md:grid-cols-2">
      {hasLocal && <OfficeBlock title="Your local election office" jurisdiction={local} />}
      {hasState && <OfficeBlock title="State election office" jurisdiction={state} />}
    </div>
  );
};

export default ElectionOffice;
