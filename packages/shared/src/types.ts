import { z } from 'zod';
import { tenantSchema } from './schemas/tenant.js';
import { tenantDomainSchema } from './schemas/tenant-domain.js';
import { userSchema } from './schemas/user.js';
import { tokenSchema } from './schemas/token.js';
import { nodeSchema, nodeType } from './schemas/node.js';

export type Tenant = z.infer<typeof tenantSchema>;
export type TenantDomain = z.infer<typeof tenantDomainSchema>;
export type User = z.infer<typeof userSchema>;
export type Token = z.infer<typeof tokenSchema>;
export type NodeType = z.infer<typeof nodeType>;
export type Node = z.infer<typeof nodeSchema>;
