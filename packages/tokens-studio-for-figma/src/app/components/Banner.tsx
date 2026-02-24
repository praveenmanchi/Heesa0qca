import React from 'react';
import { styled } from '@/stitches.config';
import { IconLogo, IconBanner } from '@/icons';
import Box from './Box';

const BannerContainer = styled(Box, {
    backgroundColor: '#0048B7',
    height: '72px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 $5',
    overflow: 'hidden',
    position: 'relative',
});

const LogoWrapper = styled(Box, {
    color: '$fgOnEmphasis',
    display: 'flex',
    alignItems: 'center',
    zIndex: 1,
});

const BannerImageWrapper = styled(Box, {
    position: 'absolute',
    right: 0,
    top: 0,
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    pointerEvents: 'none',
});

const Banner = () => (
    <BannerContainer>
        <LogoWrapper>
            <IconLogo />
        </LogoWrapper>
        <BannerImageWrapper>
            <IconBanner />
        </BannerImageWrapper>
    </BannerContainer>
);

export default Banner;
