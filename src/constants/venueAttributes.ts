export type VenueAttrKey =
  | 'accessible_entrance'
  | 'accessible_restroom'
  | 'accessible_seating'
  | 'accessible_parking'
  | 'on_street_parking'
  | 'private_parking_lot'
  | 'paid_parking_nearby'
  | 'free_parking_nearby'
  | 'public_transit_nearby'
  | 'bike_parking'
  | 'family_friendly'
  | 'outdoor_seating'
  | 'indoor_seating'
  | 'pet_friendly'
  | 'food_available'
  | 'alcohol_served'
  | 'wheelchair_ramp'
  | 'elevator'

export const VENUE_ATTR_LABELS: Record<VenueAttrKey, string> = {
  accessible_entrance: 'Accessible entrance',
  accessible_restroom: 'Accessible restroom',
  accessible_seating: 'Accessible seating',
  accessible_parking: 'Accessible parking',
  on_street_parking: 'On-street parking',
  private_parking_lot: 'Private parking lot',
  paid_parking_nearby: 'Paid parking nearby',
  free_parking_nearby: 'Free parking nearby',
  public_transit_nearby: 'Public transit nearby',
  bike_parking: 'Bike parking',
  family_friendly: 'Family-friendly',
  outdoor_seating: 'Outdoor seating',
  indoor_seating: 'Indoor seating',
  pet_friendly: 'Pet-friendly',
  food_available: 'Food available',
  alcohol_served: 'Alcohol served',
  wheelchair_ramp: 'Wheelchair ramp',
  elevator: 'Elevator'
}

export const VENUE_ATTR_GROUPS = [
  {
    id: 'accessibility',
    title: 'Accessibility',
    keys: ['accessible_entrance', 'wheelchair_ramp', 'elevator', 'accessible_restroom', 'accessible_seating', 'accessible_parking']
  },
  {
    id: 'parking',
    title: 'Parking',
    keys: ['on_street_parking', 'private_parking_lot', 'free_parking_nearby', 'paid_parking_nearby']
  },
  {
    id: 'transit',
    title: 'Transit & Bikes',
    keys: ['public_transit_nearby', 'bike_parking']
  },
  {
    id: 'environment',
    title: 'Venue Details',
    keys: ['indoor_seating', 'outdoor_seating', 'family_friendly', 'pet_friendly', 'food_available', 'alcohol_served']
  }
] as const

export const isVenueAttrKey = (key: string): key is VenueAttrKey => (VENUE_ATTR_LABELS as any)[key] !== undefined
