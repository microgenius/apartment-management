import { useState, useEffect } from 'react';
import { settingsService } from '../services/settingsService';

export function useSettings() {
  const [meetingDate, setMeetingDate] = useState<string>('2024-07-15');
  const [monthlyDue, setMonthlyDue] = useState<number>(0);
  const [debtStartDate, setDebtStartDate] = useState<string>('2024-01-01');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      setError(null);
      const date = await settingsService.getMeetingDate();
      const due = await settingsService.getMonthlyDue();
      const startDate = await settingsService.getDebtStartDate();
      setMeetingDate(date);
      setMonthlyDue(due);
      setDebtStartDate(startDate);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch settings');
      console.error('Error fetching settings:', err);
    } finally {
      setLoading(false);
    }
  };

  const updateMeetingDate = async (date: string) => {
    try {
      await settingsService.setMeetingDate(date);
      setMeetingDate(date);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update meeting date');
      console.error('Error updating meeting date:', err);
      throw err;
    }
  };

  const updateMonthlyDue = async (amount: number) => {
    try {
      await settingsService.setMonthlyDue(amount);
      setMonthlyDue(amount);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update monthly due');
      console.error('Error updating monthly due:', err);
      throw err;
    }
  };

  const updateDebtStartDate = async (date: string) => {
    try {
      await settingsService.setDebtStartDate(date);
      setDebtStartDate(date);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update debt start date');
      console.error('Error updating debt start date:', err);
      throw err;
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  return {
    meetingDate,
    setMeetingDate: updateMeetingDate,
    monthlyDue,
    setMonthlyDue: updateMonthlyDue,
    debtStartDate,
    setDebtStartDate: updateDebtStartDate,
    loading,
    error,
    refetch: fetchSettings
  };
}
