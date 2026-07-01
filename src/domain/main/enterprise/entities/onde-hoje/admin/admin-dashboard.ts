export interface AdminDashboard {
  usersCount: number;
  placesCount: number;
  groupsCount: number;
  todayVotesCount: number;
  openReportsCount: number;
  topPlaces: Array<{
    publicId: string;
    name: string;
    city: string | null;
    votesCount: number;
  }>;
}
