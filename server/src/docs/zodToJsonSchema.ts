import {
    ZodFirstPartyTypeKind,
    type ZodArray,
    type ZodDefault,
    type ZodEffects,
    type ZodLazy,
    type ZodNullable,
    type ZodObject,
    type ZodOptional,
    type ZodRecord,
    type ZodTypeAny
} from 'zod';

export type JsonSchema = Record<string, unknown>;

interface ConvertedSchema {
    schema: JsonSchema;
    nullable: boolean;
    optional: boolean;
    defaultValue?: unknown;
}

interface BaseSchemaResult {
    schema: JsonSchema;
    nullable: boolean;
}

interface UnwrappedSchema {
    schema: ZodTypeAny;
    nullable: boolean;
    optional: boolean;
    defaultValue?: unknown;
}

function isZodType<T extends ZodTypeAny>(schema: ZodTypeAny, kind: ZodFirstPartyTypeKind): schema is T {
    return schema._def.typeName === kind;
}

function isNeverType(schema: ZodTypeAny): boolean {
    return schema._def.typeName === ZodFirstPartyTypeKind.ZodNever;
}

function cloneSchema(schema: JsonSchema): JsonSchema {
    return JSON.parse(JSON.stringify(schema));
}

function unwrapSchema(schema: ZodTypeAny): UnwrappedSchema {
    let current: ZodTypeAny = schema;
    let nullable = false;
    let optional = false;
    let defaultValue: unknown;

    // eslint-disable-next-line no-constant-condition
    while (true) {
        const typeName = current._def.typeName;
        switch (typeName) {
            case ZodFirstPartyTypeKind.ZodOptional: {
                optional = true;
                current = (current as ZodOptional<ZodTypeAny>)._def.innerType;
                continue;
            }
            case ZodFirstPartyTypeKind.ZodNullable: {
                nullable = true;
                current = (current as ZodNullable<ZodTypeAny>)._def.innerType;
                continue;
            }
            case ZodFirstPartyTypeKind.ZodDefault: {
                const def = current as ZodDefault<ZodTypeAny>;
                defaultValue = def._def.defaultValue();
                current = def._def.innerType;
                continue;
            }
            case ZodFirstPartyTypeKind.ZodEffects: {
                current = (current as ZodEffects<ZodTypeAny>)._def.schema;
                continue;
            }
            case ZodFirstPartyTypeKind.ZodPipeline: {
                current = (current as unknown as { _def: { out: ZodTypeAny } })._def.out;
                continue;
            }
            case ZodFirstPartyTypeKind.ZodBranded: {
                current = (current as unknown as { _def: { type: ZodTypeAny } })._def.type;
                continue;
            }
            case ZodFirstPartyTypeKind.ZodLazy: {
                current = (current as ZodLazy<ZodTypeAny>)._def.getter();
                continue;
            }
            default:
                return { schema: current, nullable, optional, defaultValue };
        }
    }
}

function convertNumberChecks(schema: JsonSchema, checks: Array<Record<string, unknown>>): void {
    checks.forEach((check) => {
        if (check.kind === 'min') {
            if (typeof check.value === 'number') {
                schema.minimum = check.value;
                if (check.inclusive === false) {
                    schema.exclusiveMinimum = true;
                }
            }
        } else if (check.kind === 'max') {
            if (typeof check.value === 'number') {
                schema.maximum = check.value;
                if (check.inclusive === false) {
                    schema.exclusiveMaximum = true;
                }
            }
        } else if (check.kind === 'multipleOf') {
            if (typeof check.value === 'number') {
                schema.multipleOf = check.value;
            }
        } else if (check.kind === 'int') {
            schema.type = 'integer';
        }
    });
}

function convertStringChecks(schema: JsonSchema, checks: Array<Record<string, unknown>>): void {
    checks.forEach((check) => {
        if (check.kind === 'min' && typeof check.value === 'number') {
            schema.minLength = check.value;
        } else if (check.kind === 'max' && typeof check.value === 'number') {
            schema.maxLength = check.value;
        } else if (check.kind === 'email') {
            schema.format = 'email';
        } else if (check.kind === 'uuid') {
            schema.format = 'uuid';
        } else if (check.kind === 'cuid') {
            schema.format = 'string';
            schema.pattern = '^[c][0-9a-z]+$';
        } else if (check.kind === 'regex' && check.regex instanceof RegExp) {
            schema.pattern = check.regex.source;
        }
    });
}

function mergeNullable(target: JsonSchema, nullable: boolean): JsonSchema {
    if (nullable) {
        if (Object.prototype.hasOwnProperty.call(target, 'nullable')) {
            target.nullable = target.nullable || nullable;
        } else {
            target.nullable = true;
        }
    }
    return target;
}

function convertBaseSchema(schema: ZodTypeAny, seen: Set<ZodTypeAny>): BaseSchemaResult {
    const baseSchema = schema as unknown as { _def: any };
    const typeName = baseSchema._def.typeName as ZodFirstPartyTypeKind;

    if (seen.has(schema)) {
        return { schema: {}, nullable: false };
    }

    if (isZodType<ZodObject<any>>(schema, ZodFirstPartyTypeKind.ZodObject)) {
        seen.add(schema);
        const def = baseSchema._def as ZodObject<any>['_def'];
        const shape = def.shape();
        const properties: Record<string, JsonSchema> = {};
        const required: string[] = [];

        for (const key of Object.keys(shape)) {
            const valueSchema = shape[key] as ZodTypeAny;
            const child = convert(valueSchema, seen);
            const childSchema = cloneSchema(child.schema);
            if (child.defaultValue !== undefined) {
                childSchema.default = child.defaultValue;
            }
            mergeNullable(childSchema, child.nullable);
            properties[key] = childSchema;
            if (!child.optional) required.push(key);
        }

        const jsonSchema: JsonSchema = { type: 'object', properties };
        if (required.length > 0) {
            jsonSchema.required = required;
        }

        if (def.catchall && !isNeverType(def.catchall as ZodTypeAny)) {
            const catchall = convert(def.catchall as ZodTypeAny, seen);
            const additional = cloneSchema(catchall.schema);
            mergeNullable(additional, catchall.nullable);
            jsonSchema.additionalProperties = additional;
        } else if (def.unknownKeys === 'strict') {
            jsonSchema.additionalProperties = false;
        }

        seen.delete(schema);
        return { schema: jsonSchema, nullable: false };
    }

    if (isZodType(schema, ZodFirstPartyTypeKind.ZodString)) {
        const jsonSchema: JsonSchema = { type: 'string' };
        const checks = (baseSchema._def as any).checks as Array<Record<string, unknown>> | undefined;
        convertStringChecks(jsonSchema, checks ?? []);
        return { schema: jsonSchema, nullable: false };
    }

    if (isZodType(schema, ZodFirstPartyTypeKind.ZodNumber)) {
        const jsonSchema: JsonSchema = { type: 'number' };
        const checks = (baseSchema._def as any).checks as Array<Record<string, unknown>> | undefined;
        convertNumberChecks(jsonSchema, checks ?? []);
        return { schema: jsonSchema, nullable: false };
    }

    if (isZodType(schema, ZodFirstPartyTypeKind.ZodBoolean)) {
        return { schema: { type: 'boolean' }, nullable: false };
    }

    if (isZodType(schema, ZodFirstPartyTypeKind.ZodBigInt)) {
        return { schema: { type: 'integer', format: 'int64' }, nullable: false };
    }

    if (isZodType(schema, ZodFirstPartyTypeKind.ZodDate)) {
        return { schema: { type: 'string', format: 'date-time' }, nullable: false };
    }

    if (isZodType(schema, ZodFirstPartyTypeKind.ZodEnum)) {
        const values = (baseSchema._def as any).values as string[];
        return { schema: { type: 'string', enum: [...values] }, nullable: false };
    }

    if (isZodType(schema, ZodFirstPartyTypeKind.ZodNativeEnum)) {
        const enumValues = Object.values((baseSchema._def as any).values).filter((value) => typeof value === 'string');
        return { schema: { type: 'string', enum: enumValues }, nullable: false };
    }

    if (isZodType(schema, ZodFirstPartyTypeKind.ZodLiteral)) {
        const value = (baseSchema._def as any).value;
        const literalSchema: JsonSchema = { enum: [value] };
        if (value === null) {
            return { schema: literalSchema, nullable: true };
        }
        if (typeof value === 'string') {
            literalSchema.type = 'string';
        } else if (typeof value === 'number') {
            literalSchema.type = Number.isInteger(value) ? 'integer' : 'number';
        } else if (typeof value === 'boolean') {
            literalSchema.type = 'boolean';
        }
        return { schema: literalSchema, nullable: value === null };
    }

    if (isZodType(schema, ZodFirstPartyTypeKind.ZodNull)) {
        return { schema: { enum: [null] }, nullable: true };
    }

    if (isZodType(schema, ZodFirstPartyTypeKind.ZodArray)) {
        const def = baseSchema._def as ZodArray<ZodTypeAny>['_def'];
        const itemsConverted = convert(def.type as ZodTypeAny, seen);
        const itemsSchema = cloneSchema(itemsConverted.schema);
        mergeNullable(itemsSchema, itemsConverted.nullable);

        const arraySchema: JsonSchema = { type: 'array', items: itemsSchema };
        const checks = (def as any).checks as Array<Record<string, unknown>> | undefined;
        if (Array.isArray(checks)) {
            checks.forEach((check) => {
                if (check.kind === 'min' && typeof check.value === 'number') {
                    arraySchema.minItems = check.value;
                } else if (check.kind === 'max' && typeof check.value === 'number') {
                    arraySchema.maxItems = check.value;
                }
            });
        }
        return { schema: arraySchema, nullable: false };
    }

    if (isZodType(schema, ZodFirstPartyTypeKind.ZodTuple)) {
        const tupleDef = baseSchema._def as any;
        const items = (tupleDef.items as ZodTypeAny[]).map((item) => {
            const converted = convert(item, seen);
            const json = cloneSchema(converted.schema);
            mergeNullable(json, converted.nullable);
            return json;
        });
        const tupleSchema: JsonSchema = { type: 'array', prefixItems: items, minItems: items.length, maxItems: items.length };
        return { schema: tupleSchema, nullable: false };
    }

    if (isZodType(schema, ZodFirstPartyTypeKind.ZodUnion)) {
        const optionResults = (baseSchema._def as any).options.map((option: ZodTypeAny) => convert(option, seen));
        const optionSchemas: JsonSchema[] = [];
        let unionNullable = false;

        optionResults.forEach((result: ConvertedSchema) => {
            const isNullEnum =
                Array.isArray(result.schema.enum) &&
                result.schema.enum.length === 1 &&
                result.schema.enum[0] === null;

            if (isNullEnum) {
                unionNullable = true;
                return;
            }

            const schemaEntry = cloneSchema(result.schema);
            mergeNullable(schemaEntry, result.nullable);
            if (result.defaultValue !== undefined) {
                schemaEntry.default = result.defaultValue;
            }
            optionSchemas.push(schemaEntry);
        });

        if (optionSchemas.length === 0) {
            return { schema: {}, nullable: true };
        }
        if (optionSchemas.length === 1) {
            const [onlySchema] = optionSchemas;
            return { schema: onlySchema ?? {}, nullable: unionNullable };
        }
        return { schema: { oneOf: optionSchemas }, nullable: unionNullable };
    }

    if (isZodType(schema, ZodFirstPartyTypeKind.ZodDiscriminatedUnion)) {
        const optionResults = (baseSchema._def as any).options.map((option: ZodTypeAny) => convert(option, seen));
        const optionSchemas = optionResults.map((result: ConvertedSchema) => {
            const schemaClone = cloneSchema(result.schema);
            mergeNullable(schemaClone, result.nullable);
            return schemaClone;
        });
        return { schema: { oneOf: optionSchemas }, nullable: false };
    }

    if (isZodType(schema, ZodFirstPartyTypeKind.ZodRecord)) {
        const def = baseSchema._def as ZodRecord<ZodTypeAny>['_def'];
        const valueSchema = convert(def.valueType as ZodTypeAny, seen);
        const additional = cloneSchema(valueSchema.schema);
        mergeNullable(additional, valueSchema.nullable);
        return {
            schema: {
                type: 'object',
                additionalProperties: additional
            },
            nullable: false
        };
    }

    if (isZodType(schema, ZodFirstPartyTypeKind.ZodAny) || isZodType(schema, ZodFirstPartyTypeKind.ZodUnknown)) {
        return { schema: {}, nullable: false };
    }

    if (isZodType(schema, ZodFirstPartyTypeKind.ZodPromise)) {
        const result = convert((baseSchema._def as any).type as ZodTypeAny, seen);
        return { schema: cloneSchema(result.schema), nullable: result.nullable };
    }

    if (isZodType(schema, ZodFirstPartyTypeKind.ZodMap)) {
        const mapDef = baseSchema._def as any;
        const key = convert(mapDef.keyType as ZodTypeAny, seen);
        const value = convert(mapDef.valueType as ZodTypeAny, seen);
        const mapSchema: JsonSchema = {
            type: 'array',
            items: {
                type: 'array',
                prefixItems: [
                    mergeNullable(cloneSchema(key.schema), key.nullable),
                    mergeNullable(cloneSchema(value.schema), value.nullable)
                ],
                minItems: 2,
                maxItems: 2
            }
        };
        return { schema: mapSchema, nullable: false };
    }

    return { schema: {}, nullable: false };
}

export function convert(schema: ZodTypeAny, seen: Set<ZodTypeAny> = new Set()): ConvertedSchema {
    const unwrapped = unwrapSchema(schema);
    const base = convertBaseSchema(unwrapped.schema, seen);
    return {
        schema: base.schema,
        nullable: unwrapped.nullable || base.nullable,
        optional: unwrapped.optional,
        defaultValue: unwrapped.defaultValue
    };
}

export class SchemaRegistry {
    private readonly schemas = new Map<string, JsonSchema>();

    register(name: string, schema: ZodTypeAny): JsonSchema {
        if (!this.schemas.has(name)) {
            const converted = convert(schema);
            const stored = cloneSchema(converted.schema);
            mergeNullable(stored, converted.nullable);
            if (converted.defaultValue !== undefined) {
                stored.default = converted.defaultValue;
            }
            this.schemas.set(name, stored);
        }
        return this.ref(name);
    }

    ref(name: string): JsonSchema {
        if (!this.schemas.has(name)) {
            throw new Error(`Schema "${name}" has not been registered`);
        }
        return { $ref: `#/components/schemas/${name}` };
    }

    get components(): Record<string, JsonSchema> {
        const entries: Record<string, JsonSchema> = {};
        this.schemas.forEach((schema, name) => {
            entries[name] = schema;
        });
        return entries;
    }
}
