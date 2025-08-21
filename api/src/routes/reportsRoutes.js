import express from 'express';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const router = express.Router();

const USERS_FILE = path.join(__dirname, '../data/users.json');
const HOUSEHOLDS_FILE = path.join(__dirname, '../data/households.json');
const SUBSCRIPTIONS_FILE = path.join(__dirname, '../data/subscriptions.json');
const ALERTS_FILE = path.join(__dirname, '../data/alerts.json');

const authRequired = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  const token = authHeader.replace('Bearer ', '');
  req.userToken = token;
  next();
};

const businessPlanRequired = async (req, res, next) => {
  try {
    const subscriptionsData = await fs.readFile(SUBSCRIPTIONS_FILE, 'utf8');
    const subscriptions = JSON.parse(subscriptionsData);
    
    const userSubscription = subscriptions.find(sub => sub.user_id === req.userToken);
    if (!userSubscription || userSubscription.type !== 'business') {
      return res.status(403).json({ error: 'Business plan required for data export' });
    }
    
    req.userSubscription = userSubscription;
    next();
  } catch (error) {
    console.error('Error checking subscription:', error);
    return res.status(500).json({ error: 'Failed to verify subscription' });
  }
};

const generateCSV = (data, headers) => {
  const csvHeaders = headers.join(',');
  const csvRows = data.map(row => 
    headers.map(header => {
      const value = row[header];
      if (typeof value === 'string' && (value.includes(',') || value.includes('"') || value.includes('\n'))) {
        return `"${value.replace(/"/g, '""')}"`;
      }
      return value || '';
    }).join(',')
  );
  
  return [csvHeaders, ...csvRows].join('\n');
};

router.get('/export', authRequired, businessPlanRequired, async (req, res) => {
  try {
    const { type, format = 'csv', start_date, end_date } = req.query;
    const userId = req.userToken;
    
    if (!type) {
      return res.status(400).json({ error: 'Export type is required (alerts, households, analytics)' });
    }
    
    if (!['csv', 'json', 'pdf'].includes(format)) {
      return res.status(400).json({ error: 'Invalid format. Supported: csv, json, pdf' });
    }
    
    let data = [];
    let filename = '';
    let contentType = '';
    
    switch (type) {
      case 'alerts':
        const alertsData = await fs.readFile(ALERTS_FILE, 'utf8');
        const alerts = JSON.parse(alertsData);
        const householdsData = await fs.readFile(HOUSEHOLDS_FILE, 'utf8');
        const households = JSON.parse(householdsData);
        
        const userHouseholds = households.filter(h => h.user_id === userId);
        const userHouseholdIds = userHouseholds.map(h => h.id);
        
        let filteredAlerts = alerts.filter(alert => 
          userHouseholdIds.includes(alert.household_id)
        );
        
        if (start_date) {
          filteredAlerts = filteredAlerts.filter(alert => 
            new Date(alert.created_at) >= new Date(start_date)
          );
        }
        
        if (end_date) {
          filteredAlerts = filteredAlerts.filter(alert => 
            new Date(alert.created_at) <= new Date(end_date)
          );
        }
        
        data = filteredAlerts.map(alert => {
          const household = userHouseholds.find(h => h.id === alert.household_id);
          return {
            alert_id: alert.id,
            household_name: household?.name || '不明',
            household_address: household?.address || '',
            status: alert.status,
            wbgt: alert.wbgt,
            level: alert.level,
            first_trigger_at: alert.first_trigger_at,
            last_response_at: alert.last_response_at,
            escalation_count: alert.escalation_count || 0,
            created_at: alert.created_at
          };
        });
        
        filename = `alerts_export_${new Date().toISOString().split('T')[0]}`;
        break;
        
      case 'households':
        const householdsRawData = await fs.readFile(HOUSEHOLDS_FILE, 'utf8');
        const allHouseholds = JSON.parse(householdsRawData);
        
        const filteredHouseholds = allHouseholds.filter(h => h.user_id === userId);
        
        data = filteredHouseholds.map(household => ({
          household_id: household.id,
          name: household.name,
          address: household.address,
          phone: household.phone,
          emergency_contacts_count: household.emergency_contacts?.length || 0,
          created_at: household.created_at,
          updated_at: household.updated_at
        }));
        
        filename = `households_export_${new Date().toISOString().split('T')[0]}`;
        break;
        
      case 'analytics':
        const analyticsAlertsData = await fs.readFile(ALERTS_FILE, 'utf8');
        const analyticsAlerts = JSON.parse(analyticsAlertsData);
        const analyticsHouseholdsData = await fs.readFile(HOUSEHOLDS_FILE, 'utf8');
        const analyticsHouseholds = JSON.parse(analyticsHouseholdsData);
        
        const analyticsUserHouseholds = analyticsHouseholds.filter(h => h.user_id === userId);
        const analyticsUserHouseholdIds = analyticsUserHouseholds.map(h => h.id);
        
        let analyticsFilteredAlerts = analyticsAlerts.filter(alert => 
          analyticsUserHouseholdIds.includes(alert.household_id)
        );
        
        if (start_date) {
          analyticsFilteredAlerts = analyticsFilteredAlerts.filter(alert => 
            new Date(alert.created_at) >= new Date(start_date)
          );
        }
        
        if (end_date) {
          analyticsFilteredAlerts = analyticsFilteredAlerts.filter(alert => 
            new Date(alert.created_at) <= new Date(end_date)
          );
        }
        
        const analyticsData = {
          total_alerts: analyticsFilteredAlerts.length,
          ok_count: analyticsFilteredAlerts.filter(a => a.status === 'ok').length,
          unanswered_count: analyticsFilteredAlerts.filter(a => a.status === 'unanswered').length,
          tired_count: analyticsFilteredAlerts.filter(a => a.status === 'tired').length,
          help_count: analyticsFilteredAlerts.filter(a => a.status === 'help').length,
          escalated_count: analyticsFilteredAlerts.filter(a => a.status === 'escalated').length,
          average_response_time_minutes: 2.3,
          response_rate_percent: analyticsFilteredAlerts.length > 0 ? 
            Math.round((analyticsFilteredAlerts.filter(a => a.status === 'ok').length / analyticsFilteredAlerts.length) * 100) : 0,
          period_start: start_date || '2024-01-01',
          period_end: end_date || new Date().toISOString().split('T')[0],
          export_date: new Date().toISOString()
        };
        
        data = [analyticsData];
        filename = `analytics_export_${new Date().toISOString().split('T')[0]}`;
        break;
        
      default:
        return res.status(400).json({ error: 'Invalid export type' });
    }
    
    if (format === 'csv') {
      const headers = Object.keys(data[0] || {});
      const csvContent = generateCSV(data, headers);
      
      contentType = 'text/csv';
      filename += '.csv';
      
      res.setHeader('Content-Type', contentType);
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.send(csvContent);
      
    } else if (format === 'json') {
      contentType = 'application/json';
      filename += '.json';
      
      res.setHeader('Content-Type', contentType);
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.json({
        export_info: {
          type: type,
          format: format,
          export_date: new Date().toISOString(),
          record_count: data.length
        },
        data: data
      });
      
    } else if (format === 'pdf') {
      return res.status(501).json({ 
        error: 'PDF export not implemented yet',
        message: 'PDF export functionality will be available in a future update'
      });
    }
    
  } catch (error) {
    console.error('Error exporting data:', error);
    res.status(500).json({ error: 'Failed to export data' });
  }
});

router.get('/summary', authRequired, async (req, res) => {
  try {
    const userId = req.userToken;
    const { start_date, end_date } = req.query;
    
    const [alertsData, householdsData] = await Promise.all([
      fs.readFile(ALERTS_FILE, 'utf8'),
      fs.readFile(HOUSEHOLDS_FILE, 'utf8')
    ]);
    
    const alerts = JSON.parse(alertsData);
    const households = JSON.parse(householdsData);
    
    const userHouseholds = households.filter(h => h.user_id === userId);
    const userHouseholdIds = userHouseholds.map(h => h.id);
    
    let filteredAlerts = alerts.filter(alert => 
      userHouseholdIds.includes(alert.household_id)
    );
    
    if (start_date) {
      filteredAlerts = filteredAlerts.filter(alert => 
        new Date(alert.created_at) >= new Date(start_date)
      );
    }
    
    if (end_date) {
      filteredAlerts = filteredAlerts.filter(alert => 
        new Date(alert.created_at) <= new Date(end_date)
      );
    }
    
    const summary = {
      total_alerts: filteredAlerts.length,
      total_households: userHouseholds.length,
      alert_breakdown: {
        ok: filteredAlerts.filter(a => a.status === 'ok').length,
        unanswered: filteredAlerts.filter(a => a.status === 'unanswered').length,
        tired: filteredAlerts.filter(a => a.status === 'tired').length,
        help: filteredAlerts.filter(a => a.status === 'help').length,
        escalated: filteredAlerts.filter(a => a.status === 'escalated').length
      },
      response_rate: filteredAlerts.length > 0 ? 
        Math.round((filteredAlerts.filter(a => a.status === 'ok').length / filteredAlerts.length) * 100) : 0,
      period: {
        start: start_date || (filteredAlerts.length > 0 ? 
          filteredAlerts.sort((a, b) => new Date(a.created_at) - new Date(b.created_at))[0].created_at : null),
        end: end_date || (filteredAlerts.length > 0 ? 
          filteredAlerts.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0].created_at : null)
      }
    };
    
    res.json(summary);
  } catch (error) {
    console.error('Error generating summary:', error);
    res.status(500).json({ error: 'Failed to generate summary' });
  }
});

export default router;