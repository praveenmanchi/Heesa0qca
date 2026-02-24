import React from 'react';
import { styled } from '@/stitches.config';
import { IconLogo, IconBanner } from '@/icons';
import Box from './Box';

const BannerContainer = styled(Box, {
    backgroundColor: '#01579B', // More accurate Tokens Studio blue from some themes
    height: '77px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 16px',
    overflow: 'hidden',
    position: 'relative',
});

const LogoWrapper = styled(Box, {
    color: '$white',
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
