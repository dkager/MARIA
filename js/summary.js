// Part of MARIA (MathML Automatisch Renderen In ASCII)
export function formulasText(n) {
  return n === 1 ? '1 formule' : `${n} formules`;
}

function problemText(count, [one, more]) {
  return `${formulasText(count)} ${count === 1 ? one : more}`;
}

export function summaryText(converted) {
  const warnings = [];
  if (converted.skipped) {
    warnings.push(problemText(converted.skipped, ['is overgeslagen (To do-commentaar)', 'zijn overgeslagen (To do-commentaar)']));
  }
  if (converted.unknown) {
    warnings.push(problemText(converted.unknown, ['bevat een teken dat MathCAT niet kent', 'bevatten een teken dat MathCAT niet kent']));
  }
  if (converted.empty) {
    warnings.push(problemText(converted.empty, ['is leeg', 'zijn leeg']));
  }
  if (converted.mfencedChanged) {
    warnings.push(`bij ${converted.mfencedChanged} <mfenced> is separators="" toegevoegd`);
  }
  if (converted.flagged) {
    warnings.push(`${formulasText(converted.flagged)} voorgelegd door de heuristiek`);
  }
  if (converted.noBreakSpaces) {
    const verb = converted.noBreakSpaces === 1 ? 'misbruikt' : 'misbruiken';
    warnings.push(`${formulasText(converted.noBreakSpaces)} ${verb} harde spaties`);
  }
  if (!warnings.length) {
    return null;
  }
  const text = warnings.join('; ');
  return `${text[0].toUpperCase()}${text.slice(1)}.`;
}
