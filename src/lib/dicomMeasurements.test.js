import { test } from 'node:test'
import assert from 'node:assert/strict'
import { extractMeasurements } from './dicomMeasurements.js'

test('extracts lengths, areas, angles and arrow labels', () => {
  const rows = extractMeasurements([
    { metadata: { toolName: 'Length' }, data: { cachedStats: { 'img:1': { length: 12.345, unit: 'mm' } } } },
    { metadata: { toolName: 'EllipticalROI' }, data: { cachedStats: { a: { area: 100.04, areaUnit: 'mm²', mean: 41.26 } } } },
    { metadata: { toolName: 'Angle' }, data: { cachedStats: { a: { angle: 87.66 } } } },
    { metadata: { toolName: 'ArrowAnnotate' }, data: { label: 'Nodule' } },
    { metadata: { toolName: 'Length' }, data: { cachedStats: {} } },
    {},
  ])
  assert.deepEqual(rows.map((r) => `${r.label}|${r.value}|${r.unit}`), [
    'Longueur|12.3|mm',
    'ROI elliptique|100|mm²',
    'ROI elliptique (moyenne)|41.3|',
    'Angle|87.7|°',
    'Flèche : Nodule||',
  ])
})
