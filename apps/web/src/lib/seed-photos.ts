const cdn = (id: string, w = 800) =>
  `https://images.unsplash.com/photo-${id}?w=${w}&q=80&auto=format&fit=crop`;

export interface SeedPhoto {
  id: string;
  url: string;
  thumbUrl: string;
  ratio: '1:1' | '3:2' | '4:3' | '16:9';
  subject: string;
}

export const SEED_PHOTOS: SeedPhoto[] = [
  { id: '1506905925346-21bda4d32df4', subject: 'Misty Mountains',       ratio: '3:2', url: cdn('1506905925346-21bda4d32df4', 1600), thumbUrl: cdn('1506905925346-21bda4d32df4', 400) },
  { id: '1469474968028-56623f02e42e', subject: 'Mountain Valley',       ratio: '3:2', url: cdn('1469474968028-56623f02e42e', 1600), thumbUrl: cdn('1469474968028-56623f02e42e', 400) },
  { id: '1470071459604-3b5ec3a7fe05', subject: 'Foggy Forest',          ratio: '3:2', url: cdn('1470071459604-3b5ec3a7fe05', 1600), thumbUrl: cdn('1470071459604-3b5ec3a7fe05', 400) },
  { id: '1441974231531-c6227db76b6e', subject: 'Sunlit Forest',         ratio: '3:2', url: cdn('1441974231531-c6227db76b6e', 1600), thumbUrl: cdn('1441974231531-c6227db76b6e', 400) },
  { id: '1501785888041-af3ef285b470', subject: 'Lake & Mountains',      ratio: '3:2', url: cdn('1501785888041-af3ef285b470', 1600), thumbUrl: cdn('1501785888041-af3ef285b470', 400) },
  { id: '1454496522488-7a8e488e8606', subject: 'Milky Way Mountains',   ratio: '3:2', url: cdn('1454496522488-7a8e488e8606', 1600), thumbUrl: cdn('1454496522488-7a8e488e8606', 400) },
  { id: '1426604966848-d7adac402bff', subject: 'Green Valley River',    ratio: '3:2', url: cdn('1426604966848-d7adac402bff', 1600), thumbUrl: cdn('1426604966848-d7adac402bff', 400) },
  { id: '1433086966358-54859d0ed716', subject: 'Waterfall',             ratio: '3:2', url: cdn('1433086966358-54859d0ed716', 1600), thumbUrl: cdn('1433086966358-54859d0ed716', 400) },
  { id: '1505765050516-f72dcac9c60e', subject: 'Alpine Road',           ratio: '3:2', url: cdn('1505765050516-f72dcac9c60e', 1600), thumbUrl: cdn('1505765050516-f72dcac9c60e', 400) },
  { id: '1418065460487-3e41a6c84dc5', subject: 'Rolling Hills',         ratio: '3:2', url: cdn('1418065460487-3e41a6c84dc5', 1600), thumbUrl: cdn('1418065460487-3e41a6c84dc5', 400) },
  { id: '1470770841072-f978cf4d019e', subject: 'Lake Cabin',            ratio: '3:2', url: cdn('1470770841072-f978cf4d019e', 1600), thumbUrl: cdn('1470770841072-f978cf4d019e', 400) },
  { id: '1472214103451-9374bd1c798e', subject: 'Golden Field Sunset',   ratio: '3:2', url: cdn('1472214103451-9374bd1c798e', 1600), thumbUrl: cdn('1472214103451-9374bd1c798e', 400) },
  { id: '1418489098061-ce87b5dc3aee', subject: 'Ocean Cliffs',          ratio: '3:2', url: cdn('1418489098061-ce87b5dc3aee', 1600), thumbUrl: cdn('1418489098061-ce87b5dc3aee', 400) },
  { id: '1444703686981-a3abbc4d4fe3', subject: 'Desert Dunes',          ratio: '3:2', url: cdn('1444703686981-a3abbc4d4fe3', 1600), thumbUrl: cdn('1444703686981-a3abbc4d4fe3', 400) },
  { id: '1439066615861-d1af74d74000', subject: 'Autumn Forest Path',    ratio: '3:2', url: cdn('1439066615861-d1af74d74000', 1600), thumbUrl: cdn('1439066615861-d1af74d74000', 400) },
  { id: '1500534623283-312aade485b7', subject: 'Snowy Peak',            ratio: '3:2', url: cdn('1500534623283-312aade485b7', 1600), thumbUrl: cdn('1500534623283-312aade485b7', 400) },
  { id: '1519681393784-d120267933ba', subject: 'Mountain Night Sky',    ratio: '3:2', url: cdn('1519681393784-d120267933ba', 1600), thumbUrl: cdn('1519681393784-d120267933ba', 400) },
  { id: '1507525428034-b723cf961d3e', subject: 'Turquoise Beach',       ratio: '3:2', url: cdn('1507525428034-b723cf961d3e', 1600), thumbUrl: cdn('1507525428034-b723cf961d3e', 400) },
  { id: '1486915309851-b0cc1f8a0084', subject: 'Studio Portrait',       ratio: '3:2', url: cdn('1486915309851-b0cc1f8a0084', 1600), thumbUrl: cdn('1486915309851-b0cc1f8a0084', 400) },
  { id: '1492691527719-9d1e07e534b4', subject: 'Window Light Portrait', ratio: '3:2', url: cdn('1492691527719-9d1e07e534b4', 1600), thumbUrl: cdn('1492691527719-9d1e07e534b4', 400) },
  { id: '1463453091185-61582044d556', subject: 'B&W Male Portrait',     ratio: '3:2', url: cdn('1463453091185-61582044d556', 1600), thumbUrl: cdn('1463453091185-61582044d556', 400) },
  { id: '1517841905240-472988babdf9', subject: 'Female Portrait',       ratio: '3:2', url: cdn('1517841905240-472988babdf9', 1600), thumbUrl: cdn('1517841905240-472988babdf9', 400) },
  { id: '1488161628813-04466f872be2', subject: 'Candid Portrait',       ratio: '3:2', url: cdn('1488161628813-04466f872be2', 1600), thumbUrl: cdn('1488161628813-04466f872be2', 400) },
  { id: '1531123414780-f74242c2b052', subject: 'Street Portrait',       ratio: '3:2', url: cdn('1531123414780-f74242c2b052', 1600), thumbUrl: cdn('1531123414780-f74242c2b052', 400) },
  { id: '1524504388940-b1c1722653e1', subject: 'Editorial Portrait',    ratio: '3:2', url: cdn('1524504388940-b1c1722653e1', 1600), thumbUrl: cdn('1524504388940-b1c1722653e1', 400) },
];

export function seedPhoto(index: number): SeedPhoto {
  return SEED_PHOTOS[index % SEED_PHOTOS.length]!;
}

export function seedPhotoUrl(index: number, w = 800): string {
  const { id } = SEED_PHOTOS[index % SEED_PHOTOS.length]!;
  return cdn(id, w);
}

export function seedThumbUrl(index: number): string {
  return seedPhotoUrl(index, 400);
}

export const SEED_AVATAR_IDS = [
  '1531746020798-e6953c6e8e04',
  '1570295999919-56ceb5ecca61',
  '1552374196-1ab2a1c593e8',
  '1544005313-94ddf0286df2',
  '1499290731724-12d120b2e357',
  '1507003211169-0a1dd7228f2d',
  '1438761681033-6461ffad8d80',
  '1472099645785-5658abf4ff4e',
];

export function seedAvatarUrl(index: number, size = 120): string {
  const id = SEED_AVATAR_IDS[index % SEED_AVATAR_IDS.length]!;
  return cdn(id, size);
}
