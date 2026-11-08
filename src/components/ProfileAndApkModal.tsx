import React from 'react';
import {
  X,
  Trophy,
} from 'lucide-react';
import { PlayerProfile } from '../types/arcade';
import { ACHIEVEMENTS, getRankInfo } from '../services/profileStore';
import { soundFX } from '../services/soundAndHaptics';

interface ProfileAndApkModalProps {
  isOpen: boolean;
  profile: PlayerProfile;
  onClose: () => void;
}

export const ProfileAndApkModal: React.FC<ProfileAndApkModalProps> = ({
  isOpen,
  profile,
  onClose,
}) => {
  if (!isOpen) return null;

  const rank = getRankInfo(profile.totalXp);

  const scoreCards = [
    {
      name: 'Prism Drop (Tetris)',
      color: 'text-cyan-400',
      val: profile.highScores.tetrisScore.toLocaleString(),
      sub: `Max Lines: ${profile.highScores.tetrisMaxLines}`,
    },
    {
      name: 'Quantum Grid (X-O)',
      color: 'text-rose-400',
      val: `${profile.highScores.xoWinsAI} Wins`,
      sub: `Minimax Holds: ${profile.highScores.xoWinsUnbeatableDrawsOrWins}`,
    },
    {
      name: 'Viper Pulse (Snake)',
      color: 'text-emerald-400',
      val: profile.highScores.snakeScore.toLocaleString(),
      sub: `Max Length: ${profile.highScores.snakeMaxLength}`,
    },
    {
      name: 'Aegis Breaker',
      color: 'text-violet-400',
      val: profile.highScores.breakerScore.toLocaleString(),
      sub: '3D Crystal Arkanoid',
    },
    {
      name: 'Vector Pong',
      color: 'text-sky-400',
      val: `${profile.highScores.pongWins} Wins`,
      sub: '3D Overdrive Rink',
    },
    {
      name: 'Gravity Drop 4',
      color: 'text-amber-400',
      val: `${profile.highScores.connect4Wins} Wins`,
      sub: '7×6 Vertical Matrix',
    },
    {
      name: 'Hexa Pulse 2048',
      color: 'text-fuchsia-400',
      val: profile.highScores.merge2048BestScore.toLocaleString(),
      sub: `Peak Tile: ${profile.highScores.merge2048MaxTile}`,
    },
    {
      name: 'Void Runner',
      color: 'text-cyan-300',
      val: profile.highScores.runnerBestScore.toLocaleString(),
      sub: '3D Starfighter Canyon',
    },
    {
      name: 'Cyber Mines',
      color: 'text-rose-300',
      val: `${profile.highScores.minesClearedCount} Cleared`,
      sub: 'Sector Zero Vaults',
    },
    {
      name: 'Nova Invaders',
      color: 'text-cyan-400',
      val: profile.highScores.invadersScore.toLocaleString(),
      sub: 'Aegis Descent 3D',
    },
    {
      name: 'Cyber Pac',
      color: 'text-amber-300',
      val: (profile.highScores.pacScore ?? 0).toLocaleString(),
      sub: `Max Wave: ${profile.highScores.pacMaxWave ?? 1}`,
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-3 sm:p-6 pointer-events-auto">
      <div className="relative w-full max-w-4xl max-h-[90vh] flex flex-col rounded-2xl bg-[#0B0F19] border border-slate-800 shadow-2xl overflow-hidden">
        {/* Top Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <Trophy className="w-5 h-5 text-amber-400" />
            <h2 className="text-sm sm:text-base font-bold font-display text-white">
              Game Profile &amp; Achievements
            </h2>
          </div>
          <button
            onClick={() => {
              soundFX.playUiTap();
              onClose();
            }}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl bg-slate-900 text-slate-300 hover:text-white hover:bg-slate-800"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {/* Rank & XP Summary Banner */}
          <div className="p-4 rounded-xl bg-[#07090E] border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="text-xs font-medium text-cyan-400">
                RANK · LEVEL {rank.level} · {rank.rankTitle}
              </div>
              <div className="text-xl font-bold font-display text-white mt-0.5">
                {profile.callsign}
              </div>
              <div className="text-xs text-slate-400 mt-1 tabular-nums">
                Total XP: {profile.totalXp.toLocaleString()} · Matches Played: {profile.gamesPlayed} · Daily Directives: {profile.dailyChallenge?.totalCompleted ?? 0} ({profile.dailyChallenge?.streakDays ?? 0}d Streak)
              </div>
            </div>
            <div className="w-full sm:w-56">
              <div className="flex justify-between text-xs text-slate-400 mb-1.5 tabular-nums">
                <span>Level {rank.level} Progress</span>
                <span>
                  {rank.currentLevelXp} / {rank.nextLevelXp} XP
                </span>
              </div>
              <div className="h-2.5 w-full rounded-full bg-slate-900 overflow-hidden border border-slate-800">
                <div
                  className="h-full bg-gradient-to-r from-cyan-400 to-emerald-400 transition-all duration-300"
                  style={{ width: `${rank.progressPct}%` }}
                />
              </div>
            </div>
          </div>

          {/* High Scores Across All 10 Games */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            {scoreCards.map((sc) => (
              <div
                key={sc.name}
                className="p-3 rounded-xl bg-slate-900/70 border border-slate-800/90"
              >
                <div className={`text-xs font-medium ${sc.color}`}>{sc.name}</div>
                <div className="text-xl font-bold font-mono tabular-nums text-white mt-0.5">
                  {sc.val}
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5 tabular-nums">{sc.sub}</div>
              </div>
            ))}
          </div>

          {/* Achievements List */}
          <div>
            <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2 mb-3">
              <Trophy className="w-4 h-4 text-amber-400" />
              Arcade Achievements ({profile.unlockedAchievementIds.length} / {ACHIEVEMENTS.length})
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {ACHIEVEMENTS.map((ach) => {
                const unlocked = profile.unlockedAchievementIds.includes(ach.id);
                return (
                  <div
                    key={ach.id}
                    className={`p-3 rounded-xl border transition-colors ${
                      unlocked
                        ? 'bg-slate-900/90 border-cyan-500/35'
                        : 'bg-[#07090E]/70 border-slate-800/70 opacity-65'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-100">{ach.title}</span>
                      <span className="text-xs font-mono tabular-nums text-cyan-400">
                        +{ach.xpReward} XP
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-1">{ach.description}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
