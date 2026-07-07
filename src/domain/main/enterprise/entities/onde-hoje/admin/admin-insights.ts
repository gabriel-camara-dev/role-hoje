export interface AdminDailyPoint {
  day: string;
  count: number;
}

export interface AdminCityVotes {
  city: string;
  votes: number;
}

export interface AdminVoteTypeCount {
  voteType: string;
  count: number;
}

export interface AdminOverview {
  users: {
    total: number;
    newToday: number;
    newLast7Days: number;
    activeToday: number;
    activeLast7Days: number;
    verified: number;
    withGoogle: number;
    admins: number;
  };
  votes: {
    activeTotal: number;
    today: number;
    cancelledTotal: number;
    last7Days: number;
  };
  places: {
    activeTotal: number;
    newToday: number;
  };
  groups: {
    total: number;
    newToday: number;
  };
  friendships: {
    accepted: number;
    pending: number;
  };
  reports: {
    open: number;
    total: number;
  };
  voteTypesToday: AdminVoteTypeCount[];
  votesPerDay: AdminDailyPoint[];
  signupsPerDay: AdminDailyPoint[];
  topCitiesToday: AdminCityVotes[];
}

export interface AdminVoterStat {
  publicId: string;
  name: string;
  username: string;
  votesCount: number;
}

export interface AdminCancellerStat {
  publicId: string;
  name: string;
  username: string;
  cancelledCount: number;
}

export interface AdminSuspiciousLogin {
  publicId: string;
  name: string;
  username: string;
  loginAttempts: number;
  lastLogin: string | null;
}

export interface AdminReportedPlace {
  publicId: string;
  name: string;
  city: string | null;
  openReports: number;
}

export interface AdminRecentReport {
  publicId: string;
  reason: string;
  status: string;
  placeName: string | null;
  reporterName: string;
  createdAt: string;
}

export interface AdminAbuseReport {
  topVotersToday: AdminVoterStat[];
  topCancellersToday: AdminCancellerStat[];
  heavyVotersAllTime: AdminVoterStat[];
  suspiciousLogins: AdminSuspiciousLogin[];
  reportedPlaces: AdminReportedPlace[];
  recentReports: AdminRecentReport[];
}

export interface AdminAuthStatusCount {
  status: string;
  count: number;
}

export interface AdminAuthIpStat {
  ipAddress: string;
  attempts: number;
}

export interface AdminAuthAttempt {
  status: string;
  ipAddress: string | null;
  userAgent: string | null;
  userName: string | null;
  createdAt: string;
}

export interface AdminAuthActivity {
  loginsToday: number;
  failedToday: number;
  unknownUserToday: number;
  blockedToday: number;
  uniqueUsersToday: number;
  loginsPerDay: AdminDailyPoint[];
  statusBreakdown: AdminAuthStatusCount[];
  topFailedIps: AdminAuthIpStat[];
  recentAttempts: AdminAuthAttempt[];
}
