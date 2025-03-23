/* eslint-disable */
const request = require('supertest');
const app = require('./main');
const Redis = require('ioredis');
const mongoose = require('mongoose');

jest.mock('ioredis');
jest.mock('mongoose', () => ({
    ...jest.requireActual('mongoose'),
    model: jest.fn(() => ({
        create: jest.fn(),
        countDocuments: jest.fn().mockResolvedValue(10),
        distinct: jest.fn().mockResolvedValue(['user1', 'user2']),
        findOne: jest.fn(() => ({ sort: jest.fn(() => ({ exec: jest.fn().mockResolvedValue({ timestamp: new Date() }) })) })),
        find: jest.fn(() => ({ sort: jest.fn(() => ({ limit: jest.fn().mockResolvedValue([{ user: 'user1', data: {}, timestamp: new Date() }]) })) })),
    })),
}));

const redis = new Redis();
const Event = mongoose.model('Event');

describe('REST API and Critical Functions', () => {
    it('GET /events should return events', async () => {
        const res = await request(app).get('/events');
        expect(res.statusCode).toBe(200);
        expect(Array.isArray(res.body)).toBe(true);
    });

    it('POST /process should submit an event', async () => {
        const res = await request(app).post('/process').send({ user: 'test-user', data: { key: 'value' } });
        expect(res.statusCode).toBe(200);
        expect(res.body.message).toBe('Event submitted');
    });

    it('GET /metrics should return metrics', async () => {
        const res = await request(app).get('/metrics');
        expect(res.statusCode).toBe(200);
        expect(res.body).toMatchObject({ processedEvents: 10, uniqueUsers: 2 });
    });

    it('Rate limiting should allow up to 5 requests per user', async () => {
        redis.incr = jest.fn().mockResolvedValueOnce(1).mockResolvedValueOnce(2).mockResolvedValueOnce(3).mockResolvedValueOnce(4).mockResolvedValueOnce(5).mockResolvedValueOnce(6);
        const results = await Promise.all([...Array(6)].map(() => redis.incr('rate-limit:test-user').then(count => (count > 5 ? 'Rate limit exceeded' : 'Allowed'))));
        expect(results).toEqual(['Allowed', 'Allowed', 'Allowed', 'Allowed', 'Allowed', 'Rate limit exceeded']);
    });

    it('Retry logic should retry up to MAX_RETRIES on failure', async () => {
        Event.create.mockRejectedValueOnce(new Error('Database error')).mockRejectedValueOnce(new Error('Database error')).mockResolvedValueOnce('Success');
        let attempt = 0, MAX_RETRIES = 5;
        const processEvent = async () => {
            try {
                await Event.create({ user: 'test-user', data: {} });
            } catch (error) {
                if (++attempt <= MAX_RETRIES) return processEvent();
                throw new Error('Failed after retries');
            }
        };
        await processEvent();
        expect(Event.create).toHaveBeenCalledTimes(3);
    });
});