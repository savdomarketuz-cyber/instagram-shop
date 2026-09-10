import { createHash } from 'crypto';

export function parsePersona(raw) {
    if (!raw) return null;
    if (typeof raw === 'string') {
        try { return JSON.parse(raw); } catch { return null; }
    }
    return raw;
}

export function buildEmbeddingText(p) {
    const persona = parsePersona(p.ai_persona);
    const visionMeta = p.image_metadata 
        ? Object.values(p.image_metadata).map(m => (m.alt_uz || '') + ' ' + (m.alt_ru || '')).filter(Boolean).join(' ') 
        : '';

    const parts = [
        p.name_uz || p.name || '',
        p.name_ru || '',
        p.model ? `Model: ${p.model}` : '',
        p.article ? `Artikul: ${p.article}` : '',
        p.category_name || '',
    ];

    if (persona) {
        if (Array.isArray(persona.personas)) parts.push(persona.personas.join(', '));
        if (Array.isArray(persona.use_cases)) parts.push(persona.use_cases.join(', '));
        if (Array.isArray(persona.value_props)) parts.push(persona.value_props.join(', '));
        if (Array.isArray(persona.search_terms)) parts.push(persona.search_terms.join(', '));
        if (persona.one_liner_uz) parts.push(persona.one_liner_uz);
        if (persona.one_liner_ru) parts.push(persona.one_liner_ru);
    }

    if (visionMeta) parts.push(visionMeta);

    const desc = (p.description_uz || p.description || '').toString();
    if (desc) parts.push(desc.slice(0, 400));

    return parts.filter(Boolean).join('. ').slice(0, 2000);
}

export const hashText = (t) => createHash('sha256').update(t).digest('hex');
export const toVectorLiteral = (arr) => '[' + Array.from(arr).join(',') + ']';
